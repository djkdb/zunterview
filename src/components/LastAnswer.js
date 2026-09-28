import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
/** Keeps the candidate's just-submitted answer visible while the panel reviews it. */
export function LastAnswer({ text, label, lang }) {
    return (_jsxs(motion.figure, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, lang: lang, className: "w-full rounded-xl border border-dashed border-line-strong bg-surface-2 px-5 py-3.5", children: [_jsx("figcaption", { className: "label mb-1.5", children: label }), _jsx("blockquote", { className: "line-clamp-3 text-[15px] leading-relaxed text-muted", children: text })] }));
}
