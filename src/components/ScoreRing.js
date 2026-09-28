import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
/** Animated circular overall score (count-up + arc). */
export function ScoreRing({ score, size = 180 }) {
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(reduce ? score : 0);
    useEffect(() => {
        if (reduce)
            return;
        const c = animate(0, score, { duration: 1.3, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
        return () => c.stop();
    }, [score, reduce]);
    const r = 44;
    const circ = 2 * Math.PI * r;
    return (_jsxs("div", { className: "relative", style: { width: size, height: size }, role: "img", "aria-label": `종합 점수 100점 만점에 ${score}점`, children: [_jsxs("svg", { viewBox: "0 0 100 100", className: "h-full w-full -rotate-90", children: [_jsx("circle", { cx: "50", cy: "50", r: r, fill: "none", stroke: "#e3e7ed", strokeWidth: "7" }), _jsx(motion.circle, { cx: "50", cy: "50", r: r, fill: "none", stroke: "#1b3a6b", strokeWidth: "7", strokeLinecap: "round", strokeDasharray: circ, initial: { strokeDashoffset: reduce ? circ * (1 - score / 100) : circ }, animate: { strokeDashoffset: circ * (1 - score / 100) }, transition: { duration: 1.3, ease: [0.2, 0.8, 0.2, 1] } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsx("span", { className: "font-mono text-5xl font-semibold text-navy tabular-nums", children: shown }), _jsx("span", { className: "text-[12px] text-faint", children: "/ 100\uC810" })] })] }));
}
