import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_KO } from "../config/labelsKo";
/** Radar of the six categories, optionally overlaid with the previous interview. */
export function ScoreChart({ scores, previous }) {
    const data = CATEGORY_KEYS.map((k) => ({ category: CATEGORY_KO[k], current: scores[k], previous: previous?.[k] ?? 0 }));
    return (_jsx("div", { className: "h-[250px] w-full sm:h-[280px]", role: "img", "aria-label": `항목별 점수: ${data.map((d) => `${d.category} ${d.current}`).join(", ")}`, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadarChart, { data: data, outerRadius: "70%", children: [_jsx(PolarGrid, { stroke: "#d9dee5" }), _jsx(PolarAngleAxis, { dataKey: "category", tick: { fill: "#4b5563", fontSize: 12, fontWeight: 600 } }), _jsx(PolarRadiusAxis, { domain: [0, 100], tick: false, axisLine: false }), previous && _jsx(Radar, { dataKey: "previous", stroke: "#9aa0ab", strokeDasharray: "4 4", fill: "transparent" }), _jsx(Radar, { dataKey: "current", stroke: "#1b3a6b", strokeWidth: 2, fill: "#1b3a6b", fillOpacity: 0.16, animationDuration: 1100 })] }) }) }));
}
