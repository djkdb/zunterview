import { useMemo, useState } from "react";
import { COMPANIES, type CompanyCategory } from "../../shared/companies";

export function useCompanyFilter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CompanyCategory | "전체">("전체");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPANIES.filter(
      (c) =>
        (category === "전체" || c.category === category) &&
        (!q || c.name.toLowerCase().includes(q) || (c.shortName ?? "").toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)),
    );
  }, [query, category]);
  return { query, setQuery, category, setCategory, list };
}
