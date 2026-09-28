import { useState } from "react";
import { companyTracks, getCompany } from "../../shared/companies";
import { useCompanyFilter } from "../hooks/useCompanyFilter";
import { CompanyCard } from "./CompanyCard";
import { CompanyFilterBar } from "./CompanyFilterBar";
import { Button } from "./ui/Button";

interface Props {
  companyId: string | undefined;
  track: string | undefined;
  onChange: (companyId: string | undefined, track: string | undefined) => void;
}

/** Optional: pick the company/institution to model the interview on. */
export function CompanyPicker({ companyId, track, onChange }: Props) {
  const c = getCompany(companyId);
  const [browsing, setBrowsing] = useState(false);
  const f = useCompanyFilter();

  if (c && !browsing) {
    const tracks = companyTracks(c);
    return (
      <div className="rounded-xl border border-accent/30 bg-accent-soft/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-bold text-ink">{c.name}</p>
            <p className="text-[12px] text-muted">
              {c.category} · {c.industry} · 예상 질문 {c.questions.length}개
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setBrowsing(true)}>
              변경
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(undefined, undefined)}>
              선택 해제
            </Button>
          </div>
        </div>
        {c.talent.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1">
            {c.talent.slice(0, 5).map((t) => (
              <span key={t} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-accent">
                {t}
              </span>
            ))}
          </p>
        )}
        <p className="mt-2 text-[12px] text-muted">전형: {c.process.join(" → ")}</p>
        {tracks.length > 1 && (
          <div className="mt-3">
            <p className="label mb-1.5">직무 트랙</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="직무 트랙">
              {tracks.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={(track ?? "공통") === t}
                  onClick={() => onChange(c.id, t)}
                  className={`rounded-full border px-3 py-1 text-[12px] ${(track ?? "공통") === t ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!browsing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3.5">
        <p className="text-[14px] text-muted">
          <b className="text-ink">일반 면접</b>으로 진행합니다. 기업을 고르면 그 기업의 인재상·전형·기출 기반 질문으로 면접합니다.
        </p>
        <Button size="sm" variant="secondary" onClick={() => setBrowsing(true)}>
          기업 선택하기
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line-strong p-4">
      <CompanyFilterBar query={f.query} onQuery={f.setQuery} category={f.category} onCategory={f.setCategory} />
      <ul className="scroll-thin mt-3 grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {f.list.map((x) => (
          <li key={x.id}>
            <CompanyCard
              c={x}
              compact
              active={x.id === companyId}
              onClick={() => {
                onChange(x.id, undefined);
                setBrowsing(false);
              }}
            />
          </li>
        ))}
        {!f.list.length && <li className="col-span-full py-6 text-center text-sm text-muted">검색 결과가 없습니다.</li>}
      </ul>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setBrowsing(false)}>
          닫기
        </Button>
      </div>
    </div>
  );
}
