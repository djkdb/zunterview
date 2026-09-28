import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { COMPANIES } from "../../shared/companies";
import { CompanyCard } from "../components/CompanyCard";
import { CompanyFilterBar } from "../components/CompanyFilterBar";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { COMPANY_DISCLAIMER } from "../config/options";
import { useCompanyFilter } from "../hooks/useCompanyFilter";
export function CompaniesPage({ onOpen, onHome, onStart }) {
    const f = useCompanyFilter();
    const total = COMPANIES.reduce((s, c) => s + c.questions.length, 0);
    return (_jsxs("div", { className: "min-h-dvh pb-16", children: [_jsx(TopBar, { onHome: onHome, right: _jsx(Button, { size: "sm", variant: "primary", onClick: onStart, children: "\uC77C\uBC18 \uBA74\uC811 \uBCF4\uAE30" }) }), _jsxs("main", { className: "mx-auto w-full max-w-6xl px-4 sm:px-6", children: [_jsxs("div", { className: "pt-8 pb-6", children: [_jsx("p", { className: "text-sm font-semibold text-accent", children: "\uAE30\uC5C5\uBCC4 \uBAA8\uC758\uBA74\uC811" }), _jsx("h1", { className: "mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl", children: "\uC9C0\uC6D0\uD558\uB294 \uAE30\uC5C5\uC758 \uBA74\uC811\uC744 \uBBF8\uB9AC \uACBD\uD5D8\uD574 \uBCF4\uC138\uC694" }), _jsxs("p", { className: "mt-2 text-[15px] text-muted", children: ["\uB300\uAE30\uC5C5\u00B7IT\u00B7\uAE08\uC735\u00B7\uACF5\uAE30\uC5C5\u00B7\uACF5\uACF5\uAE30\uAD00 ", COMPANIES.length, "\uACF3, \uC608\uC0C1 \uC9C8\uBB38 ", total, "\uAC1C. \uC778\uC7AC\uC0C1\uACFC \uBA74\uC811 \uC804\uD615, \uC2E4\uC81C \uD6C4\uAE30\uC5D0 \uBCF4\uACE0\uB41C \uC9C8\uBB38\uC744 \uBC14\uD0D5\uC73C\uB85C \uBA74\uC811\uAD00\uC774 \uC9C8\uBB38\uD569\uB2C8\uB2E4."] })] }), _jsx(CompanyFilterBar, { query: f.query, onQuery: f.setQuery, category: f.category, onCategory: f.setCategory }), f.list.length ? (_jsx("ul", { className: "mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", children: f.list.map((c) => (_jsx("li", { children: _jsx(CompanyCard, { c: c, onClick: () => onOpen(c.id) }) }, c.id))) })) : (_jsx("p", { className: "mt-10 text-center text-sm text-muted", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uC5C5\uC774 \uC5C6\uB2E4\uBA74 \uC77C\uBC18 \uBA74\uC811\uC5D0 \uCC44\uC6A9\uACF5\uACE0\uB97C \uBD99\uC5EC\uB123\uC5B4 \uC5F0\uC2B5\uD560 \uC218 \uC788\uC5B4\uC694." })), _jsx("p", { className: "mt-10 text-center text-[12px] leading-relaxed text-faint", children: COMPANY_DISCLAIMER })] })] }));
}
