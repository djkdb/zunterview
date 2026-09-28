import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { DebugPanel } from "./components/DebugPanel";
import { useInterview } from "./hooks/useInterview";
import { HistoryPage } from "./pages/HistoryPage";
import { InterviewPage } from "./pages/InterviewPage";
import { LandingPage } from "./pages/LandingPage";
import { SetupPage } from "./pages/SetupPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { CompanyPage } from "./pages/CompanyPage";
import { clearActiveInterview, clearAllLocalData, loadActiveInterview, loadHistory, loadInterview } from "./utils/storage";
const loadResultPage = () => import("./pages/ResultPage").then((m) => ({ default: m.ResultPage }));
const ResultPage = lazy(loadResultPage);
const DEBUG = new URLSearchParams(window.location.search).get("debug") === "true";
export default function App() {
    const ctl = useInterview();
    const { state, status, actions } = ctl;
    const [idleView, setIdleView] = useState("landing");
    const [companyView, setCompanyView] = useState(null);
    const [preset, setPreset] = useState(null);
    const [fromHistory, setFromHistory] = useState(false);
    const [historyVersion, setHistoryVersion] = useState(0);
    const [activeVersion, setActiveVersion] = useState(0);
    // An interview interrupted by a refresh / closed tab can be resumed from the landing page.
    const activeInterview = useMemo(() => {
        void activeVersion;
        return state.phase === "IDLE" ? loadActiveInterview() : null;
    }, [state.phase, activeVersion]);
    // History is re-read whenever a new result lands or data is cleared.
    const history = useMemo(() => {
        void historyVersion;
        void state.interview?.completed;
        return loadHistory();
    }, [historyVersion, state.interview?.completed]);
    const screen = (() => {
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
    const goIdle = useCallback((v) => {
        setIdleView(v);
        actions.reset();
        window.scrollTo(0, 0);
    }, [actions]);
    const goHome = useCallback(() => goIdle("landing"), [goIdle]);
    const goHistory = useCallback(() => goIdle("history"), [goIdle]);
    const goCompanies = useCallback(() => goIdle("companies"), [goIdle]);
    const openCompany = useCallback((id) => {
        setCompanyView(id);
        goIdle("company");
    }, [goIdle]);
    const goSetup = useCallback((p = null) => {
        void loadResultPage(); // warm the results chunk (charts) while the interview runs
        setPreset(p);
        setFromHistory(false);
        actions.openSetup();
        window.scrollTo(0, 0);
    }, [actions]);
    const openInterview = useCallback((id) => {
        const i = loadInterview(id);
        if (!i)
            return;
        setFromHistory(true);
        actions.viewInterview(i);
    }, [actions]);
    const canOpen = useCallback((id) => loadInterview(id) !== null, []);
    const clearData = useCallback(() => {
        clearAllLocalData();
        setHistoryVersion((v) => v + 1);
    }, []);
    const modeLabel = status?.mode === "ai" ? "AI 면접관" : "MOCK 모드";
    const engineLabel = status?.mode === "ai" ? `Claude AI${status.model ? ` (${status.model})` : ""}` : "MOCK 면접관 (API 키 없음)";
    return (_jsx(MotionConfig, { reducedMotion: "user", children: _jsxs("div", { className: "ambient min-h-dvh", children: [_jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 }, children: [screen === "landing" && (_jsx(LandingPage, { status: status, history: history, onStart: () => goSetup(), onHistory: goHistory, onCompanies: goCompanies, onOpenCompany: openCompany, onOpenInterview: openInterview, canOpen: canOpen, active: activeInterview, onResume: () => activeInterview && void actions.resume(activeInterview), onDiscard: () => {
                                    clearActiveInterview();
                                    setActiveVersion((v) => v + 1);
                                } })), screen === "history" && _jsx(HistoryPage, { history: history, onOpen: openInterview, canOpen: canOpen, onStart: () => goSetup(), onHome: goHome, onClear: clearData }), screen === "companies" && _jsx(CompaniesPage, { onOpen: openCompany, onHome: goHome, onStart: () => goSetup() }), screen === "company" && companyView && (_jsx(CompanyPage, { id: companyView, onStart: (companyId, track) => goSetup({ companyId, track }), onBack: goCompanies, onHome: goHome })), screen === "setup" && _jsx(SetupPage, { status: status, onStart: actions.start, onHome: goHome, preset: preset }), screen === "interview" && state.interview && _jsx(InterviewPage, { ctl: ctl, modeLabel: modeLabel, engineLabel: engineLabel }), screen === "result" && state.interview && (_jsx(Suspense, { fallback: _jsx("div", { className: "min-h-dvh" }), children: _jsx(ResultPage, { interview: state.interview, fromHistory: fromHistory, storageOk: ctl.storageOk, onNew: () => goSetup(), onRetake: () => {
                                        void loadResultPage();
                                        setFromHistory(false);
                                        actions.start(state.interview.config);
                                    }, onHistory: goHistory, onHome: goHome }) }))] }, screen) }), DEBUG && _jsx(DebugPanel, { ctl: ctl, onClearData: clearData })] }) }));
}
