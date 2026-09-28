import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
/** Replaces the (disabled) answer box while the panel is busy, so nothing is covered. */
export function WaitingBar({ text }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 }, transition: { duration: 0.2 }, role: "status", className: "flex h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 text-[14px] text-muted shadow-sm", children: [_jsx("span", { className: "flex gap-1", "aria-hidden": true, children: [0, 1, 2].map((i) => (_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-accent", style: { animation: `iv-dot 1s ease-in-out ${i * 0.15}s infinite` } }, i))) }), text] }));
}
