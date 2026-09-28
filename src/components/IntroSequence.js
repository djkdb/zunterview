import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DIFFICULTY_KO, INTERVIEW_TYPE_KO } from "../config/labelsKo";
import { isVoiceOutputAvailable, speakLine } from "../services/speech/tts";
import { getCompany } from "../../shared/companies";
/**
 * 면접 대기실 → 호명 → 입실. Replaces a generic countdown with the moments
 * every Korean candidate knows (≈5.5s, skippable).
 */
export function IntroSequence({ config, applicantNo, engineLabel, voiceInput, voiceOutput, onDone }) {
    const reduce = useReducedMotion();
    const [step, setStep] = useState("waiting");
    const done = useRef(false);
    const ko = config.language === "ko";
    const callText = `지원번호 ${applicantNo}번 지원자님, 제2면접실로 입실해 주세요.`;
    const finishRef = useRef(() => { });
    useEffect(() => {
        finishRef.current = () => {
            if (done.current)
                return;
            done.current = true;
            onDone();
        };
    });
    const speaksCall = voiceOutput && isVoiceOutputAvailable();
    useEffect(() => {
        // With voice on, the doors open only after the call has been spoken (see below).
        const schedule = reduce
            ? [["call", 700], ...(speaksCall ? [] : [["end", 1500]])]
            : [["call", 2300], ...(speaksCall ? [] : [["door", 4500], ["end", 5500]])];
        const timers = schedule.map(([s, t]) => setTimeout(() => (s === "end" ? finishRef.current() : setStep(s)), t));
        return () => timers.forEach(clearTimeout);
    }, [reduce, speaksCall]);
    // The staff member's call is spoken aloud; neural voices take a moment to arrive, so wait for it (max 8s).
    useEffect(() => {
        if (step !== "call" || !speaksCall)
            return;
        let alive = true;
        const minShow = new Promise((r) => setTimeout(r, reduce ? 600 : 2000));
        const spoken = speakLine(callText, { voice: "staff", lang: "ko-KR", pitch: 1.1, voiceIndex: 1 });
        const cap = new Promise((r) => setTimeout(r, 8000));
        Promise.race([Promise.all([spoken, minShow]), cap]).then(() => {
            if (!alive)
                return;
            if (reduce)
                return finishRef.current();
            setStep("door");
        });
        return () => {
            alive = false;
        };
    }, [step, speaksCall, callText, reduce]);
    // Doors opened after the spoken call → enter the room a moment later.
    useEffect(() => {
        if (step !== "door" || !speaksCall)
            return;
        const t = setTimeout(() => finishRef.current(), 1000);
        return () => clearTimeout(t);
    }, [step, speaksCall]);
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && finishRef.current();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    const company = getCompany(config.companyId);
    const rows = [
        ["지원번호", applicantNo],
        ...(company ? [["지원 기업", `${company.name}${config.companyTrack && config.companyTrack !== "공통" ? ` · ${config.companyTrack}` : ""}`]] : []),
        ["지원 분야", config.position],
        ["면접 유형", `${INTERVIEW_TYPE_KO[config.interviewType]} · ${DIFFICULTY_KO[config.difficulty]}`],
        ["문항 수", `${config.questionLimit}문항${ko ? "" : " (영어 면접)"}`],
        ["면접 장소", "본관 3층 제2면접실"],
        ["면접 위원", "3인 (다대일 면접)"],
    ];
    return (_jsxs("div", { className: "fixed inset-0 z-40 overflow-hidden bg-bg", role: "status", "aria-live": "polite", children: [_jsx(AnimatePresence, { mode: "wait", children: step !== "door" ? (_jsxs(motion.div, { className: "flex h-full flex-col items-center justify-center px-4", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, children: [_jsx("p", { className: "mb-4 text-sm font-semibold text-muted", children: "\uBA74\uC811 \uB300\uAE30\uC2E4" }), _jsxs(motion.div, { initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.4 }, className: "w-full max-w-md overflow-hidden rounded-xl border border-line-strong bg-surface shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between bg-navy px-5 py-3 text-white", children: [_jsx("span", { className: "text-[15px] font-bold", children: "\uBAA8\uC758\uBA74\uC811 \uC218\uD5D8\uD45C" }), _jsx("span", { className: "font-mono text-[11px] tracking-[0.18em] text-white/70", children: "INTERVIEW//AI" })] }), _jsx("dl", { className: "grid grid-cols-[96px_1fr] text-[14px]", children: rows.map(([k, v]) => (_jsxs("div", { className: "contents", children: [_jsx("dt", { className: "border-b border-line bg-surface-2 px-4 py-2.5 whitespace-nowrap text-muted", children: k }), _jsx("dd", { className: "truncate border-b border-line px-4 py-2.5 font-semibold text-ink", children: v })] }, k))) }), _jsxs("div", { className: "px-5 py-4 text-[13px] leading-relaxed text-muted", children: [_jsx("p", { className: "mb-1.5 font-semibold text-ink", children: "\uC720\uC758\uC0AC\uD56D" }), _jsxs("ul", { className: "space-y-1", children: [_jsx("li", { children: "\u00B7 \uB2F5\uBCC0\uC740 \uACB0\uB860\uBD80\uD130, \uB450\uAD04\uC2DD\uC73C\uB85C \uB9D0\uD574 \uC8FC\uC138\uC694." }), _jsx("li", { children: "\u00B7 \uBA74\uC811\uAD00\uC774 \uB2F5\uBCC0 \uB0B4\uC6A9\uC744 \uBC14\uD0D5\uC73C\uB85C \uCD94\uAC00 \uC9C8\uBB38(\uAF2C\uB9AC\uC9C8\uBB38)\uC744 \uD569\uB2C8\uB2E4." }), _jsxs("li", { children: ["\u00B7 ", voiceInput ? "음성 답변은 [음성 답변] 버튼을 누를 때만 마이크가 켜집니다." : "이 브라우저에서는 텍스트로 답변합니다."] })] }), _jsxs("p", { className: "mt-3 text-[11px] text-faint", children: ["\uBA74\uC811\uAD00: ", engineLabel, " \u00B7 \uC74C\uC131 \uC548\uB0B4 ", voiceOutput ? "켜짐" : "꺼짐"] })] })] }), _jsx("div", { className: "mt-6 h-20 w-full max-w-md", children: _jsx(AnimatePresence, { mode: "wait", children: step === "waiting" ? (_jsxs(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "text-center text-sm text-muted", children: ["\uC7A0\uC2DC \uD6C4 \uD638\uBA85\uB429\uB2C8\uB2E4", _jsx("span", { className: "animate-pulse", children: "\u2026" })] }, "wait")) : (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, className: "flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3", children: [_jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white", "aria-hidden": true, children: "\uD83D\uDCE2" }), _jsx("p", { className: "text-[15px] font-semibold text-accent", children: callText })] }, "call")) }) })] }, "waiting")) : (_jsxs(motion.div, { className: "absolute inset-0", initial: { opacity: 1 }, exit: { opacity: 0 }, children: [["left", "right"].map((side) => (_jsxs(motion.div, { className: `absolute top-0 h-full w-1/2 ${side === "left" ? "left-0 border-r" : "right-0 border-l"} border-[#1f2328] bg-gradient-to-b from-[#434a54] to-[#30353c]`, initial: { x: 0 }, animate: { x: side === "left" ? "-100%" : "100%" }, transition: { delay: 0.25, duration: 0.8, ease: [0.6, 0, 0.3, 1] }, children: [_jsx("div", { className: `absolute top-1/2 h-16 w-2.5 -translate-y-1/2 rounded bg-[#c9ced6] ${side === "left" ? "right-5" : "left-5"}` }), side === "left" && (_jsx("div", { className: "absolute top-[18%] right-6 rounded border border-[#1f2328] bg-[#f5f7fa] px-3 py-1.5 text-sm font-bold text-[#1f2328]", children: "\uC81C2\uBA74\uC811\uC2E4" }))] }, side))), _jsx(motion.p, { className: "absolute inset-x-0 bottom-[20%] text-center text-lg font-bold text-ink", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.6 }, children: "\uBA74\uC811\uC744 \uC2DC\uC791\uD558\uACA0\uC2B5\uB2C8\uB2E4" })] }, "door")) }), _jsx("button", { type: "button", onClick: () => finishRef.current(), className: "absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 text-[13px] text-faint hover:text-ink", children: "\uBC14\uB85C \uC785\uC2E4\uD558\uAE30 \u203A" })] }));
}
