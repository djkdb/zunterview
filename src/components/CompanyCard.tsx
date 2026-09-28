import type { Company } from "../../shared/companies";

export function CompanyCard({ c, onClick, active, compact }: { c: Company; onClick: () => void; active?: boolean; compact?: boolean }) {
  const reported = c.questions.filter((q) => q.basis === "후기").length;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-full w-full flex-col rounded-xl border bg-surface p-4 text-left transition-colors ${
        active ? "border-accent ring-2 ring-accent/15" : "border-line hover:border-accent/40"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-bold text-ink">{c.name}</span>
        <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{c.category}</span>
      </span>
      <span className="mt-0.5 text-[12px] text-faint">{c.industry}</span>
      {!compact && c.talent.length > 0 && (
        <span className="mt-3 flex flex-wrap gap-1">
          {c.talent.slice(0, 3).map((t) => (
            <span key={t} className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
              {t}
            </span>
          ))}
        </span>
      )}
      <span className="mt-auto pt-3 text-[11px] text-faint">
        예상 질문 {c.questions.length}개{reported ? ` · 기출 기반 ${reported}` : ""}
      </span>
    </button>
  );
}
