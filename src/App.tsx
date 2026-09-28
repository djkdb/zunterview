import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { DebugPanel } from "./components/DebugPanel";
import { useInterview } from "./hooks/useInterview";
import { HistoryPage } from "./pages/HistoryPage";
import { InterviewPage } from "./pages/InterviewPage";
import { LandingPage } from "./pages/LandingPage";
import { SetupPage } from "./pages/SetupPage";
import type { InterviewSummary } from "./types/interview";
import { clearAllLocalData, loadHistory, loadInterview } from "./utils/storage";

const loadResultPage = () => import("./pages/ResultPage").then((m) => ({ default: m.ResultPage }));
const ResultPage = lazy(loadResultPage);

const DEBUG = new URLSearchParams(window.location.search).get("debug") === "true";

type Screen = "landing" | "history" | "setup" | "interview" | "result";

export default function App() {
  const ctl = useInterview();
  const { state, status, actions } = ctl;
  const [showHistory, setShowHistory] = useState(false);
  const [fromHistory, setFromHistory] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  // History is re-read whenever a new result lands or data is cleared.
  const history: InterviewSummary[] = useMemo(() => {
    void historyVersion;
    void state.interview?.completed;
    return loadHistory();
  }, [historyVersion, state.interview?.completed]);

  const screen: Screen = (() => {
    switch (state.phase) {
      case "IDLE":
        return showHistory ? "history" : "landing";
      case "SETUP":
        return "setup";
      case "RESULT":
        return "result";
      default:
        return "interview";
    }
  })();

  const goHome = useCallback(() => {
    setShowHistory(false);
    actions.reset();
  }, [actions]);
  const goHistory = useCallback(() => {
    setShowHistory(true);
    actions.reset();
  }, [actions]);
  const goSetup = useCallback(() => {
    void loadResultPage(); // warm the results chunk (charts) while the interview runs
    setFromHistory(false);
    actions.openSetup();
  }, [actions]);
  const openInterview = useCallback(
    (id: string) => {
      const i = loadInterview(id);
      if (!i) return;
      setFromHistory(true);
      actions.viewInterview(i);
    },
    [actions],
  );
  const canOpen = useCallback((id: string) => loadInterview(id) !== null, []);
  const clearData = useCallback(() => {
    clearAllLocalData();
    setHistoryVersion((v) => v + 1);
  }, []);

  const modeLabel = status?.mode === "ai" ? "AI MODE" : "MOCK MODE";
  const engineLabel = status?.mode === "ai" ? `CLAUDE${status.model ? ` · ${status.model}` : ""}` : "MOCK";

  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient grain min-h-dvh">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {screen === "landing" && (
              <LandingPage status={status} history={history} onStart={goSetup} onHistory={goHistory} onOpenInterview={openInterview} canOpen={canOpen} />
            )}
            {screen === "history" && <HistoryPage history={history} onOpen={openInterview} canOpen={canOpen} onStart={goSetup} onHome={goHome} onClear={clearData} />}
            {screen === "setup" && <SetupPage status={status} onStart={actions.start} onHome={goHome} />}
            {screen === "interview" && state.interview && <InterviewPage ctl={ctl} modeLabel={modeLabel} engineLabel={engineLabel} />}
            {screen === "result" && state.interview && (
              <Suspense fallback={<div className="min-h-dvh" />}>
              <ResultPage
                interview={state.interview}
                fromHistory={fromHistory}
                storageOk={ctl.storageOk}
                onNew={goSetup}
                onHistory={goHistory}
                onHome={goHome}
              />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
        {DEBUG && <DebugPanel ctl={ctl} onClearData={clearData} />}
      </div>
    </MotionConfig>
  );
}
