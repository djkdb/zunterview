import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
/** Modal dialog with focus trap-lite (initial focus + Escape to close). */
export function Dialog({ open, title, children, onClose, actions }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const prev = document.activeElement;
        ref.current?.querySelector("button")?.focus();
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            prev?.focus();
        };
    }, [open, onClose]);
    return (_jsx(AnimatePresence, { children: open && (_jsx(motion.div, { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, children: _jsxs(motion.div, { ref: ref, role: "dialog", "aria-modal": "true", "aria-labelledby": "dialog-title", className: "w-full max-w-sm rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl", initial: { y: 12, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 8, opacity: 0 }, onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { id: "dialog-title", className: "text-base font-bold text-ink", children: title }), _jsx("div", { className: "mt-3 text-sm leading-relaxed text-muted", children: children }), _jsx("div", { className: "mt-6 flex justify-end gap-2", children: actions })] }) })) }));
}
