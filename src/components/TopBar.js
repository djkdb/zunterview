import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TopBar({ onHome, right, modeBadge }) {
    return (_jsx("header", { className: "no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6", children: [_jsxs("button", { type: "button", onClick: onHome, className: "flex items-center gap-2.5", "aria-label": "INTERVIEW//AI \uD648", children: [_jsxs("span", { className: "font-mono text-sm font-semibold tracking-[0.16em] text-navy", children: ["INTERVIEW", _jsx("span", { className: "text-accent-2", children: "//" }), "AI"] }), _jsx("span", { className: "hidden text-[13px] text-faint md:inline", children: "\uBAA8\uC758\uBA74\uC811\uC13C\uD130" })] }), modeBadge, _jsx("nav", { className: "ml-auto flex items-center gap-1.5", children: right })] }) }));
}
export function ModeBadge({ mode, detail }) {
    if (!mode)
        return _jsx("span", { className: "h-6 w-24 animate-pulse rounded-md bg-surface-3", "aria-hidden": true });
    return (_jsxs("span", { className: `hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold sm:inline-flex ${mode === "ai" ? "border-accent/30 bg-accent-soft text-accent" : "border-line-strong text-muted"}`, title: detail, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${mode === "ai" ? "bg-good" : "bg-faint"}` }), mode === "ai" ? "AI 면접관 연결됨" : "MOCK 모드"] }));
}
