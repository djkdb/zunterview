import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNow } from "../hooks/useTimer";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { mmss } from "../utils/format";
import { Button } from "./ui/Button";
import { MicIcon, SendIcon, StopIcon } from "./ui/icons";
export function AnswerInput({ value, onChange, onSubmit, enabled, copy, lang, timeLimit, questionStartedAt, onActivity, onDontKnow, onFocusChange }) {
    const textRef = useRef(null);
    const usedVoice = useRef(false);
    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    const appendFinal = useCallback((t) => {
        usedVoice.current = true;
        const cur = valueRef.current;
        onChange(cur ? `${cur.replace(/\s+$/, "")} ${t}` : t);
    }, [onChange]);
    const voice = useVoiceInput(lang, appendFinal);
    // Stop recording when input gets disabled (answer submitted / phase change).
    useEffect(() => {
        if (!enabled && voice.recording)
            voice.stop();
    }, [enabled, voice]);
    // Interviewer waveform reacts to the candidate "speaking" (voice) or typing.
    useEffect(() => {
        onActivity(voice.recording ? (voice.interim ? 1 : 0.5) : 0);
    }, [voice.recording, voice.interim, onActivity]);
    const typingTimer = useRef(null);
    const pulseTyping = () => {
        onActivity(0.7);
        if (typingTimer.current)
            clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => onActivity(0), 600);
    };
    const now = useNow(enabled && timeLimit > 0 && questionStartedAt !== null, 500);
    const left = timeLimit > 0 && questionStartedAt ? Math.min(timeLimit, timeLimit - Math.floor(Math.max(0, now - questionStartedAt) / 1000)) : null;
    const warn = left !== null && left <= 20 && left > 0;
    const over = left !== null && left <= 0;
    const canSubmit = enabled && value.trim().length > 0;
    const submit = () => {
        if (!canSubmit)
            return;
        if (voice.recording)
            voice.stop();
        onSubmit(usedVoice.current ? "voice" : "text");
        usedVoice.current = false;
    };
    // Focus the box for keyboard users on desktop; on phones this would pop the keyboard over the question.
    useEffect(() => {
        if (enabled && window.matchMedia("(pointer: fine)").matches)
            textRef.current?.focus({ preventScroll: true });
    }, [enabled]);
    return (_jsxs("div", { className: "w-full", children: [_jsxs("div", { className: `relative rounded-xl border bg-surface shadow-sm transition-colors duration-300 ${voice.recording ? "border-good" : enabled ? "border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15" : "border-line bg-surface-2"}`, children: [_jsx("label", { htmlFor: "answer", className: "sr-only", children: "\uB0B4 \uB2F5\uBCC0" }), _jsx("textarea", { id: "answer", ref: textRef, value: value, disabled: !enabled, onChange: (e) => {
                            onChange(e.target.value);
                            pulseTyping();
                        }, onFocus: () => onFocusChange?.(true), onBlur: () => onFocusChange?.(false), onKeyDown: (e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                submit();
                            }
                        }, placeholder: enabled ? copy.placeholder : copy.placeholderWaiting, rows: 4, maxLength: 4000, className: "block max-h-[38vh] min-h-[112px] w-full resize-y rounded-xl bg-transparent px-4 pt-4 pb-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed sm:min-h-[128px] sm:px-5" }), _jsx(AnimatePresence, { children: voice.recording && voice.interim && (_jsx(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "px-4 pb-2 text-sm text-good italic sm:px-5", "aria-live": "polite", children: voice.interim })) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4", children: [voice.supported ? (_jsx(Button, { size: "sm", variant: voice.recording ? "danger" : "secondary", onClick: voice.recording ? voice.stop : voice.start, disabled: !enabled, "aria-pressed": voice.recording, icon: voice.recording ? _jsx(StopIcon, { width: 14, height: 14 }) : _jsx(MicIcon, { width: 14, height: 14 }), className: "h-9", children: voice.recording ? "정지" : "음성 답변" })) : null, voice.recording && (_jsxs("span", { className: "flex items-center gap-1.5 text-[12px] font-semibold text-low", children: [_jsx("span", { className: "h-2 w-2 animate-pulse rounded-full bg-low" }), " \uB179\uC74C \uC911"] })), _jsxs("span", { className: "ml-auto flex items-center gap-3", children: [left !== null && enabled && (_jsxs("span", { className: `font-mono text-xs tabular-nums ${over ? "text-low" : warn ? "text-warn" : "text-faint"}`, "aria-label": "\uB0A8\uC740 \uB2F5\uBCC0 \uC2DC\uAC04", children: [_jsx("span", { className: "hidden font-sans sm:inline", children: "\uB0A8\uC740 \uC2DC\uAC04 " }), over ? "00:00" : mmss(left)] })), value.trim() && (_jsxs("span", { className: `text-[11px] tabular-nums ${lengthHint(value).tone}`, title: "\uB9D0\uD558\uAE30 \uAE30\uC900 \uC57D 1\uBD84 \u2248 250~350\uC790", children: [_jsxs("span", { className: "hidden sm:inline", children: [value.length, "\uC790 \u00B7 "] }), lengthHint(value).label] })), _jsx(Button, { size: "sm", variant: "primary", onClick: submit, disabled: !canSubmit, icon: _jsx(SendIcon, { width: 14, height: 14 }), className: "h-9 px-4", title: "\uB2F5\uBCC0 \uC81C\uCD9C (Ctrl/\u2318 + Enter)", children: "\uB2F5\uBCC0 \uC81C\uCD9C" })] })] })] }), _jsxs("div", { className: "mt-2 flex min-h-5 items-start justify-between gap-3 px-1 text-xs", lang: copy.lang, children: [_jsx("div", { "aria-live": "polite", children: voice.error ? (_jsx("span", { className: "text-warn", children: voice.error })) : over ? (_jsx("span", { className: "text-low", children: copy.timeUp })) : warn ? (_jsx("span", { className: "text-warn", children: copy.timeAlmostUp })) : voice.recording ? (_jsx("span", { className: "text-good", children: copy.recording })) : !voice.supported ? (_jsx("span", { className: "text-faint", children: copy.textMode })) : enabled && !value.trim() ? (_jsx("span", { className: "text-faint", children: copy.emptyAnswer })) : null }), enabled && !value.trim() && !voice.recording && (_jsx("button", { type: "button", onClick: onDontKnow, className: "shrink-0 rounded px-1.5 py-0.5 text-faint underline-offset-2 hover:text-ink hover:underline", children: copy.dontKnow }))] })] }));
}
/** Real interviews expect ~1-minute answers (≈250–350 Korean characters spoken). */
function lengthHint(v) {
    const n = v.replace(/\s/g, "").length;
    if (n < 60)
        return { label: "조금 짧아요", tone: "text-warn" };
    if (n <= 450)
        return { label: "적당해요", tone: "text-good" };
    return { label: "길어요 · 핵심만", tone: "text-warn" };
}
