import { COMPANY_CATEGORIES, type CompanyCategory } from "../../shared/companies";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  category: CompanyCategory | "전체";
  onCategory: (c: CompanyCategory | "전체") => void;
}

export function CompanyFilterBar({ query, onQuery, category, onCategory }: Props) {
  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="기업·기관명 또는 업종 검색 (예: 삼성, 한전, 은행)"
        aria-label="기업 검색"
        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
      />
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="기업 분류">
        {(["전체", ...COMPANY_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => onCategory(c)}
            className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
              category === c ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
