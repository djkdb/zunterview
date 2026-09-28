import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { pad2 } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { TONE_BG } from "../utils/tones";
/** One slot per question: done / current / upcoming, with follow-ups marked. */
export function QuestionStepper({ questions, total, showScores }) {
    const current = questions.length - 1;
    return (_jsxs("nav", { "aria-label": "\uBB38\uD56D \uC9C4\uD589", className: "flex items-center gap-3", children: [_jsx("ol", { className: "flex flex-1 items-center gap-1", children: Array.from({ length: total }).map((_, i) => {
                    const q = questions[i];
                    const done = Boolean(q?.answer);
                    const isCurrent = i === current && !done;
                    const tone = done && showScores && q.score !== null ? TONE_BG[scoreTone(q.score)] : done ? "bg-navy" : "";
                    return (_jsxs("li", { className: "relative h-1.5 flex-1 overflow-hidden rounded-full bg-line-strong/60", "aria-label": `${i + 1}번 문항${q?.isFollowUp ? " (꼬리질문)" : ""}: ${done ? "답변 완료" : isCurrent ? "진행 중" : "대기"}`, children: [done && _jsx(motion.span, { className: `absolute inset-0 ${tone}`, initial: { width: 0 }, animate: { width: "100%" }, transition: { duration: 0.4 } }), isCurrent && _jsx("span", { className: "absolute inset-0 animate-pulse bg-accent/60" })] }, i));
                }) }), _jsxs("span", { className: "shrink-0 font-mono text-[12px] text-muted tabular-nums", children: [_jsx("b", { className: "text-ink", children: pad2(Math.max(1, questions.length)) }), " / ", pad2(total), questions.some((q) => q.isFollowUp) && (_jsxs("span", { className: "ml-2 font-sans text-faint", children: ["\uAF2C\uB9AC\uC9C8\uBB38 ", questions.filter((q) => q.isFollowUp).length] }))] })] }));
}
