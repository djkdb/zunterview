import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TONE_BG, TONE_TEXT } from "../utils/tones";
export function ScoreBadge({ score, tone, small }) {
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 font-mono tabular-nums ${TONE_TEXT[tone]} ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${TONE_BG[tone]}` }), score] }));
}
