import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { grade } from "../config/labelsKo";
import { shortDate } from "../utils/format";
const NAVY = "#1b3a6b";
const GRID = "#e3e7ed";
const INK_MUTED = "#7b8494";
function TrendTooltip({ active, payload }) {
    if (!active || !payload?.length)
        return null;
    const p = payload[0].payload;
    return (_jsxs("div", { className: "rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12px] shadow-md", children: [_jsxs("p", { className: "text-faint", children: [p.n, "\uD68C\uCC28 \u00B7 ", p.label] }), _jsx("p", { className: "mt-0.5 font-semibold text-ink", children: p.title }), _jsxs("p", { className: "mt-0.5 text-ink", children: [_jsx("b", { className: "font-mono text-[14px]", children: p.score }), "\uC810 \u00B7 ", grade(p.score), "\uB4F1\uAE09"] })] }));
}
/** Overall score across attempts (oldest → newest). Single series, so the title names it — no legend. */
export function ScoreTrend({ history }) {
    const data = [...history]
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-20)
        .map((h, i) => ({ n: i + 1, label: shortDate(h.createdAt), score: h.score, title: h.company ? `${h.company} · ${h.position}` : h.position }));
    const last = data[data.length - 1];
    const first = data[0];
    const delta = last.score - first.score;
    return (_jsxs("section", { className: "rounded-xl border border-line bg-surface p-4 sm:p-5", "aria-label": "\uC810\uC218 \uCD94\uC774", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-end justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-[15px] font-bold text-ink", children: "\uC885\uD569 \uC810\uC218 \uCD94\uC774" }), _jsxs("p", { className: "text-[12px] text-faint", children: ["\uCD5C\uADFC ", data.length, "\uD68C \u00B7 \uC9C8\uBB38 \uAD6C\uC131\uC774 \uB9E4\uBC88 \uB2EC\uB77C \uCC38\uACE0\uC6A9 \uCD94\uC138\uC785\uB2C8\uB2E4"] })] }), _jsxs("p", { className: "text-[13px] text-muted", children: ["\uCCAB \uAE30\uB85D \uB300\uBE44", " ", _jsx("b", { className: delta > 0 ? "text-good" : delta < 0 ? "text-warn" : "text-muted", children: delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : "변화 없음" })] })] }), _jsx("div", { className: "h-[180px] w-full", "aria-hidden": true, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: data, margin: { top: 22, right: 24, bottom: 0, left: -18 }, children: [_jsx(CartesianGrid, { vertical: false, stroke: GRID, strokeWidth: 1 }), _jsx(XAxis, { dataKey: "label", tickLine: false, axisLine: { stroke: GRID }, tick: { fill: INK_MUTED, fontSize: 11 }, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], ticks: [0, 50, 100], tickLine: false, axisLine: false, tick: { fill: INK_MUTED, fontSize: 11 } }), _jsx(Tooltip, { content: _jsx(TrendTooltip, {}), cursor: { stroke: "#9aa0ab", strokeWidth: 1 } }), _jsx(Area, { type: "monotone", dataKey: "score", stroke: NAVY, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", fill: NAVY, fillOpacity: 0.1, dot: { r: 4, fill: NAVY, fillOpacity: 1, stroke: "#ffffff", strokeWidth: 2 }, activeDot: { r: 6, fill: NAVY, fillOpacity: 1, stroke: "#ffffff", strokeWidth: 2 }, isAnimationActive: true, animationDuration: 700, children: _jsx(LabelList, { dataKey: "score", content: (props) => {
                                        const { x, y, index } = props;
                                        if (index !== data.length - 1)
                                            return null;
                                        return (_jsx("text", { x: x, y: y - 10, textAnchor: "middle", fontSize: 12, fontWeight: 700, fill: "#111827", children: last.score }));
                                    } }) })] }) }) }), _jsxs("table", { className: "sr-only", children: [_jsx("caption", { children: "\uD68C\uCC28\uBCC4 \uC885\uD569 \uC810\uC218" }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\uD68C\uCC28" }), _jsx("th", { children: "\uB0A0\uC9DC" }), _jsx("th", { children: "\uBA74\uC811" }), _jsx("th", { children: "\uC810\uC218" })] }) }), _jsx("tbody", { children: data.map((p) => (_jsxs("tr", { children: [_jsx("td", { children: p.n }), _jsx("td", { children: p.label }), _jsx("td", { children: p.title }), _jsx("td", { children: p.score })] }, p.n))) })] })] }));
}
