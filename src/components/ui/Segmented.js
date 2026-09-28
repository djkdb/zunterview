import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
/** Accessible single-choice control (radio group with arrow-key support). */
export function Segmented({ label, value, options, onChange, columns }) {
    const id = useId();
    const onKey = (e, idx) => {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir)
            return;
        e.preventDefault();
        const next = options[(idx + dir + options.length) % options.length];
        onChange(next.value);
        document.getElementById(`${id}-${String(next.value)}`)?.focus();
    };
    return (_jsxs("fieldset", { children: [_jsx("legend", { className: "label mb-2.5", children: label }), _jsx("div", { role: "radiogroup", "aria-label": label, className: "grid gap-1.5", style: { gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }, children: options.map((o, i) => {
                    const active = o.value === value;
                    return (_jsxs("button", { id: `${id}-${String(o.value)}`, type: "button", role: "radio", "aria-checked": active, tabIndex: active ? 0 : -1, onKeyDown: (e) => onKey(e, i), onClick: () => onChange(o.value), className: `min-h-11 rounded-lg border px-2 py-2 text-sm transition-colors duration-200 ${active
                            ? "border-accent bg-accent-soft font-semibold text-accent"
                            : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-ink"}`, children: [_jsx("span", { className: "block leading-tight", children: o.label }), o.hint && _jsx("span", { className: "mt-0.5 block text-[11px] text-faint", children: o.hint })] }, String(o.value)));
                }) })] }));
}
