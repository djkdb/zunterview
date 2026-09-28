import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { INTERVIEW_TYPE_KO, grade } from "../config/labelsKo";
import { durationLabel, pad2, shortDate } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { TONE_TEXT } from "../utils/tones";
import { Button } from "./ui/Button";
import { ChevronIcon } from "./ui/icons";
export function InterviewHistory({ items, onOpen, onStart, canOpen, compact }) {
    if (!items.length) {
        return (_jsxs("div", { className: "rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center", children: [_jsx("p", { className: "text-base font-bold text-ink", children: "\uC544\uC9C1 \uC751\uC2DC\uD55C \uBA74\uC811\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "mt-1.5 text-sm text-muted", children: "\uBA74\uC811\uC744 \uB9C8\uCE58\uBA74 \uD3C9\uAC00\uD45C\uAC00 \uC774\uACF3\uC5D0 \uBCF4\uAD00\uB429\uB2C8\uB2E4. \uAE30\uB85D\uC740 \uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uB9CC \uC800\uC7A5\uB3FC\uC694." }), _jsx(Button, { variant: "primary", className: "mt-5", onClick: onStart, children: "\uCCAB \uBAA8\uC758\uBA74\uC811 \uBCF4\uAE30" })] }));
    }
    return (_jsx("ol", { className: "divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface", children: items.map((s, idx) => {
            const openable = canOpen(s.id);
            return (_jsx("li", { children: _jsxs("button", { type: "button", disabled: !openable, onClick: () => onOpen(s.id), className: "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-surface sm:px-5", children: [_jsx("span", { className: "font-mono text-xs text-faint", children: pad2(idx + 1) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-[15px] font-semibold text-ink", children: s.company ? `${s.company} · ${s.position}` : s.position }), _jsxs("span", { className: "mt-0.5 block text-[12px] text-faint", children: [INTERVIEW_TYPE_KO[s.interviewType], " \u00B7 ", s.questionCount, "\uBB38\uD56D", !compact && ` · ${durationLabel(s.duration)}`, " \u00B7 ", shortDate(s.createdAt)] })] }), _jsxs("span", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "rounded border border-line px-1.5 text-[12px] font-bold text-muted", children: grade(s.score) }), _jsx("span", { className: `font-mono text-xl font-semibold tabular-nums ${TONE_TEXT[scoreTone(s.score)]}`, children: s.score })] }), openable && _jsx(ChevronIcon, { className: "text-faint" })] }) }, s.id));
        }) }));
}
