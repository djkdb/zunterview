import { jsxs as _jsxs } from "react/jsx-runtime";
const VARIANT = {
    primary: "bg-accent text-white hover:bg-navy shadow-[0_6px_20px_-8px_rgba(27,58,107,0.6)]",
    secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
    ghost: "text-muted hover:text-ink hover:bg-black/[0.04]",
    danger: "bg-surface text-low border border-low/35 hover:bg-low/5",
};
const SIZE = {
    sm: "h-9 px-3.5 text-[13px]",
    md: "h-11 px-5 text-sm",
    lg: "h-14 px-8 text-base",
};
export function Button({ variant = "secondary", size = "md", mono = false, icon, className = "", children, ...rest }) {
    return (_jsxs("button", { type: "button", ...rest, className: `inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${mono ? "font-mono tracking-[0.12em] uppercase" : ""} ${VARIANT[variant]} ${SIZE[size]} ${className}`, children: [icon, children] }));
}
