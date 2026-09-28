import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Red ink seal marking the sheet as practice-only (never a real hiring result). */
export function Stamp({ className = "" }) {
    return (_jsx("div", { className: `pointer-events-none flex h-20 w-20 -rotate-12 items-center justify-center rounded-full border-[3px] border-stamp text-stamp opacity-80 mix-blend-multiply sm:h-24 sm:w-24 ${className}`, "aria-label": "\uBAA8\uC758\uBA74\uC811 \uC5F0\uC2B5\uC6A9 \uB3C4\uC7A5", children: _jsxs("span", { className: "flex h-[84%] w-[84%] flex-col items-center justify-center rounded-full border border-stamp", children: [_jsx("span", { className: "text-[15px] font-extrabold tracking-[0.08em] sm:text-[17px]", children: "\uBAA8\uC758\uBA74\uC811" }), _jsx("span", { className: "my-0.5 h-px w-10 bg-stamp" }), _jsx("span", { className: "text-[11px] font-bold tracking-[0.3em]", children: "\uC5F0\uC2B5\uC6A9" })] }) }));
}
