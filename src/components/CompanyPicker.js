import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { companyTracks, getCompany } from "../../shared/companies";
import { useCompanyFilter } from "../hooks/useCompanyFilter";
import { CompanyCard } from "./CompanyCard";
import { CompanyFilterBar } from "./CompanyFilterBar";
import { Button } from "./ui/Button";
/** Optional: pick the company/institution to model the interview on. */
export function CompanyPicker({ companyId, track, onChange }) {
    const c = getCompany(companyId);
    const [browsing, setBrowsing] = useState(false);
    const f = useCompanyFilter();
    if (c && !browsing) {
        const tracks = companyTracks(c);
        return (_jsxs("div", { className: "rounded-xl border border-accent/30 bg-accent-soft/60 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[16px] font-bold text-ink", children: c.name }), _jsxs("p", { className: "text-[12px] text-muted", children: [c.category, " \u00B7 ", c.industry, " \u00B7 \uC608\uC0C1 \uC9C8\uBB38 ", c.questions.length, "\uAC1C"] })] }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setBrowsing(true), children: "\uBCC0\uACBD" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => onChange(undefined, undefined), children: "\uC120\uD0DD \uD574\uC81C" })] })] }), c.talent.length > 0 && (_jsx("p", { className: "mt-3 flex flex-wrap gap-1", children: c.talent.slice(0, 5).map((t) => (_jsx("span", { className: "rounded bg-surface px-1.5 py-0.5 text-[11px] text-accent", children: t }, t))) })), _jsxs("p", { className: "mt-2 text-[12px] text-muted", children: ["\uC804\uD615: ", c.process.join(" → ")] }), tracks.length > 1 && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "label mb-1.5", children: "\uC9C1\uBB34 \uD2B8\uB799" }), _jsx("div", { className: "flex flex-wrap gap-1.5", role: "radiogroup", "aria-label": "\uC9C1\uBB34 \uD2B8\uB799", children: tracks.map((t) => (_jsx("button", { type: "button", role: "radio", "aria-checked": (track ?? "공통") === t, onClick: () => onChange(c.id, t), className: `rounded-full border px-3 py-1 text-[12px] ${(track ?? "공통") === t ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"}`, children: t }, t))) })] }))] }));
    }
    if (!browsing) {
        return (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3.5", children: [_jsxs("p", { className: "text-[14px] text-muted", children: [_jsx("b", { className: "text-ink", children: "\uC77C\uBC18 \uBA74\uC811" }), "\uC73C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4. \uAE30\uC5C5\uC744 \uACE0\uB974\uBA74 \uADF8 \uAE30\uC5C5\uC758 \uC778\uC7AC\uC0C1\u00B7\uC804\uD615\u00B7\uAE30\uCD9C \uAE30\uBC18 \uC9C8\uBB38\uC73C\uB85C \uBA74\uC811\uD569\uB2C8\uB2E4."] }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setBrowsing(true), children: "\uAE30\uC5C5 \uC120\uD0DD\uD558\uAE30" })] }));
    }
    return (_jsxs("div", { className: "rounded-xl border border-line-strong p-4", children: [_jsx(CompanyFilterBar, { query: f.query, onQuery: f.setQuery, category: f.category, onCategory: f.setCategory }), _jsxs("ul", { className: "scroll-thin mt-3 grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2", children: [f.list.map((x) => (_jsx("li", { children: _jsx(CompanyCard, { c: x, compact: true, active: x.id === companyId, onClick: () => {
                                onChange(x.id, undefined);
                                setBrowsing(false);
                            } }) }, x.id))), !f.list.length && _jsx("li", { className: "col-span-full py-6 text-center text-sm text-muted", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })] }), _jsx("div", { className: "mt-3 flex justify-end", children: _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setBrowsing(false), children: "\uB2EB\uAE30" }) })] }));
}
