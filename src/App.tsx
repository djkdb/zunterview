import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { DebugPanel } from "./components/DebugPanel";
import { useInterview } from "./hooks/useInterview";
import { HistoryPage } from "./pages/HistoryPage";
import { InterviewPage } from "./pages/InterviewPage";
import { LandingPage } from "./pages/LandingPage";
import { SetupPage } from "./pages/SetupPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { CompanyPage } from "./pages/CompanyPage";
import { LegalPage, type LegalDoc } from "./pages/LegalPage";
import { AdminPage } from "./pages/AdminPage";
import { NotesPage } from "./pages/NotesPage";
import { IntroPage } from "./pages/IntroPage";
import type { InterviewConfig, InterviewSummary, PresetQuestion } from "./types/interview";
import { DEFAULT_CONFIG } from "./config/options";
import { track } from "./services/events";
import { clearActiveInterview, clearAllLocalData, loadActiveInterview, loadHistory, loadInterview, loadLastConfig } from "./utils/storage";

const loadResultPage = () => import("./pages/ResultPage").then((m) => ({ default: m.ResultPage }));
const ResultPage = lazy(loadResultPage);

const DEBUG = new URLSearchParams(window.location.search).get("debug") === "true";

type Screen = "landing" | "history" | "notes" | "intro" | "companies" | "company" | "legal" | "admin" | "setup" | "interview" | "result";
type IdleView = "landing" | "history" | "notes" | "intro" | "companies" | "company" | "legal" | "admin";

/** /terms, /privacy and /admin open those pages directly (links from outside, search results). */
function initialView(): { view: IdleView; legal: LegalDoc } {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/terms" || path === "/privacy") return { view: "legal", legal: path === "/terms" ? "terms" : "privacy" };
  if (path === "/admin") return { view: "admin", legal: "privacy" };
  if (path === "/intro") return { view: "intro", legal: "privacy" };
  return { view: "landing", legal: "privacy" };
}

export default function App() {
  const ctl = useInterview();
  const { state, status, actions } = ctl;
  const [start] = useState(initialView);
  const [idleView, setIdleView] = useState<IdleView>(start.view);
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(start.legal);
  const legalDocRef = useRef(legalDoc);
  const [companyView, setCompanyView] = useState<string | null>(null);
  const [preset, setPreset] = useState<{ companyId: string; track?: string } | null>(null);
  const [fromHistory, setFromHistory] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [activeVersion, setActiveVersion] = useState(0);
  // An interview interrupted by a refresh / closed tab can be resumed from the landing page.
  const activeInterview = useMemo(() => {
    void activeVersion;
    return state.phase === "IDLE" ? loadActiveInterview() : null;
  }, [state.phase, activeVersion]);

  // History is re-read whenever a new result lands or data is cleared.
  const history: InterviewSummary[] = useMemo(() => {
    void historyVersion;
    void state.interview?.completed;
    return loadHistory();
  }, [historyVersion, state.interview?.completed]);

  const screen: Screen = (() => {
    switch (state.phase) {
      case "IDLE":
        return idleView === "company" && !companyView ? "companies" : idleView;
      case "SETUP":
        return "setup";
      case "RESULT":
        return "result";
      default:
        return "interview";
    }
  })();

  const goIdle = useCallback(
    (v: IdleView) => {
      setIdleView(v);
      actions.reset();
      window.scrollTo(0, 0);
      // Keep the address bar meaningful for the pages people link to.
      const path = v === "legal" ? `/${legalDocRef.current}` : v === "admin" ? "/admin" : v === "intro" ? "/intro" : "/";
      if (window.location.pathname !== path) window.history.replaceState(null, "", path + window.location.search);
    },
    [actions],
  );
  const openLegal = useCallback(
    (d: LegalDoc) => {
      legalDocRef.current = d;
      setLegalDoc(d);
      goIdle("legal");
    },
    [goIdle],
  );
  const goHome = useCallback(() => goIdle("landing"), [goIdle]);
  const goHistory = useCallback(() => goIdle("history"), [goIdle]);
  const goIntro = useCallback(() => goIdle("intro"), [goIdle]);
  const goNotes = useCallback(() => {
    track("notes_viewed");
    goIdle("notes");
  }, [goIdle]);
  const goCompanies = useCallback(() => goIdle("companies"), [goIdle]);
  const openCompany = useCallback(
    (id: string) => {
      setCompanyView(id);
      goIdle("company");
    },
    [goIdle],
  );
  const goSetup = useCallback(
    (p: { companyId: string; track?: string } | null = null) => {
      void loadResultPage(); // warm the results chunk (charts) while the interview runs
      setPreset(p);
      setFromHistory(false);
      track("setup_started", { company: Boolean(p) });
      actions.openSetup();
      window.scrollTo(0, 0);
    },
    [actions],
  );
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
  /** A notebook interview borrows the settings of the interview the questions came from. */
  const practiceFromNotes = useCallback(
    (preset: PresetQuestion[], fromId: string | null) => {
      const base: InterviewConfig = (fromId && loadInterview(fromId)?.config) || { ...DEFAULT_CONFIG, ...loadLastConfig() };
      // Nothing to borrow a job from (only written answers left): choose it in setup first.
      if (!base.position.trim()) return goSetup();
      const config: InterviewConfig = { ...base, preset, questionLimit: preset.length };
      delete config.documents;
      void loadResultPage();
      setFromHistory(false);
      window.scrollTo(0, 0);
      actions.start(config);
    },
    [actions, goSetup],
  );
  const clearData = useCallback(() => {
    clearAllLocalData();
    setHistoryVersion((v) => v + 1);
  }, []);

  // One count per visit, not per return to the landing page.
  useEffect(() => track("landing_viewed", { returning: loadHistory().length > 0 }), []);

  const modeLabel = status?.mode === "ai" ? "AI 면접관" : "MOCK 모드";
  const engineLabel = status?.mode === "ai" ? `Claude AI${status.model ? ` (${status.model})` : ""}` : "MOCK 면접관 (API 키 없음)";

  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient min-h-dvh">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {screen === "landing" && (
              <LandingPage
                status={status}
                history={history}
                onStart={() => goSetup()}
                onHistory={goHistory}
                onNotes={goNotes}
                onIntro={goIntro}
                onCompanies={goCompanies}
                onOpenCompany={openCompany}
                onOpenInterview={openInterview}
                canOpen={canOpen}
                active={activeInterview}
                onResume={() => activeInterview && void actions.resume(activeInterview)}
                onDiscard={() => {
                  clearActiveInterview();
                  setActiveVersion((v) => v + 1);
                }}
                onLegal={openLegal}
              />
            )}
            {screen === "legal" && <LegalPage doc={legalDoc} onHome={goHome} onSwitch={openLegal} />}
            {screen === "admin" && <AdminPage onHome={goHome} />}
            {screen === "history" && <HistoryPage history={history} onOpen={openInterview} canOpen={canOpen} onStart={() => goSetup()} onHome={goHome} onClear={clearData} onNotes={goNotes} />}
            {screen === "intro" && <IntroPage status={status} onHome={goHome} onNotes={goNotes} onStart={() => goSetup()} />}
            {screen === "notes" && <NotesPage onStart={() => goSetup()} onPractice={practiceFromNotes} onHistory={goHistory} onHome={goHome} />}
            {screen === "companies" && <CompaniesPage onOpen={openCompany} onHome={goHome} onStart={() => goSetup()} />}
            {screen === "company" && companyView && (
              <CompanyPage id={companyView} onStart={(companyId, track) => goSetup({ companyId, track })} onBack={goCompanies} onHome={goHome} />
            )}
            {screen === "setup" && <SetupPage status={status} onStart={actions.start} onHome={goHome} preset={preset} />}
            {screen === "interview" && state.interview && <InterviewPage ctl={ctl} modeLabel={modeLabel} engineLabel={engineLabel} />}
            {screen === "result" && state.interview && (
              <Suspense fallback={<div className="min-h-dvh" />}>
              <ResultPage
                interview={state.interview}
                fromHistory={fromHistory}
                storageOk={ctl.storageOk}
                onNew={() => goSetup()}
                onRetake={() => {
                  void loadResultPage();
                  setFromHistory(false);
                  actions.start(state.interview!.config);
                }}
                onHistory={goHistory}
                onNotes={goNotes}
                onHome={goHome}
                onReanswer={actions.reanswer}
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
