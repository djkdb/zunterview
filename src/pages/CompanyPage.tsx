import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { COMPANY_Q_CATEGORIES, companyTracks, getCompany, loadCompanyQuestions, type CompanyQuestion } from "../../shared/companies";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { COMPANY_DISCLAIMER } from "../config/options";

interface Props {
  id: string;
  onStart: (companyId: string, track: string) => void;
  onBack: () => void;
  onHome: () => void;
}

export function CompanyPage({ id, onStart, onBack, onHome }: Props) {
  const c = getCompany(id);
  const [track, setTrack] = useState("공통");
  const [questions, setQuestions] = useState<CompanyQuestion[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadCompanyQuestions(id).then((qs) => alive && setQuestions(qs));
    return () => {
      alive = false;
    };
  }, [id]);
  const grouped = useMemo(() => {
    if (!c || !questions) return [];
    const qs = questions.filter((q) => track === "공통" || q.track === "공통" || q.track === track);
    return COMPANY_Q_CATEGORIES.map((cat) => ({ cat, items: qs.filter((q) => q.category === cat) })).filter((g) => g.items.length);
  }, [c, questions, track]);

  if (!c) {
    return (
      <div className="min-h-dvh">
        <TopBar onHome={onHome} />
        <p className="mt-20 text-center text-muted">기업 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }
  const tracks = companyTracks(c);

  return (
    <div className="min-h-dvh pb-28 sm:pb-16">
      <TopBar
        onHome={onHome}
        right={
          <Button size="sm" variant="ghost" onClick={onBack}>
            ← 기업 목록
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
        <div className="min-w-0">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
          <p className="text-sm font-semibold text-accent">
            {c.category}, {c.industry}
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-navy">{c.name} 모의면접</h1>
          {c.talent.length > 0 && (
            <div className="mt-4">
              <p className="label mb-2">인재상과 핵심가치</p>
              <div className="flex flex-wrap gap-1.5">
                {c.talent.map((t) => (
                  <span key={t} className="rounded-md border border-accent/25 bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-[15px] font-bold text-ink">면접 전형</h2>
            <ol className="space-y-2">
              {c.process.map((p, i) => (
                <li key={p} className="flex gap-2.5 text-[14px] text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy tabular-nums text-[10px] text-white">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">{c.style}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-[15px] font-bold text-ink">준비 팁</h2>
            <ul className="space-y-2">
              {c.tips.map((t) => (
                <li key={t} className="flex gap-2 text-[14px] leading-relaxed text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8" aria-label="예상 질문">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">연습 질문 {c.questionCount}개</h2>
            {tracks.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="직무 트랙">
                {tracks.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={track === t}
                    onClick={() => setTrack(t)}
                    className={`rounded-full border px-3 py-1 text-[12px] ${track === t ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"}`}
                  >
                    {t === "공통" ? "전체" : t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mb-4 text-[12px] text-faint">
            <span className="mr-1 rounded bg-[#dde6f3] px-1 font-semibold text-ink">공개후기 기반</span>공개 면접 후기에 보고된 질문을 연습용으로 재구성 ·
            <span className="mx-1 rounded bg-surface-3 px-1 font-semibold text-muted">인재상 기반</span>공식 자료에서 도출한 예상 질문
          </p>
          <div className="space-y-5" aria-busy={!questions}>
            {!questions && <p className="py-6 text-center text-sm text-faint">질문을 불러오는 중…</p>}
            {grouped.map((g) => (
              <div key={g.cat}>
                <h3 className="mb-2 text-[13px] font-bold text-muted">{g.cat}</h3>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {g.items.map((q) => (
                    <li key={q.text} className="flex items-start gap-3 px-4 py-3 text-[14px] text-ink">
                      <span className="flex-1">{q.text}</span>
                      {q.track !== "공통" && <span className="shrink-0 rounded border border-line px-1.5 text-[11px] text-muted">{q.track}</span>}
                      <span className={`shrink-0 rounded px-1.5 text-[11px] font-semibold ${q.basis === "후기" ? "bg-[#dde6f3] text-ink" : "bg-surface-3 text-muted"}`}>
                        {q.basis === "후기" ? "공개후기 기반" : "공식자료 기반"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-bold text-muted">출처</h2>
          <ul className="space-y-1 text-[12px]">
            {c.sources.map((s) => (
              <li key={s.url} className="truncate">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent-2 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-faint">{COMPANY_DISCLAIMER}</p>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 lg:hidden">
          <Button variant="primary" size="lg" className="w-full sm:w-auto sm:px-10" onClick={() => onStart(c.id, track)}>
            {c.shortName ?? c.name} 모의면접 보기
          </Button>
        </div>
        </div>

        <aside className="sticky top-20 mt-8 hidden rounded-xl border border-line bg-surface p-5 lg:block" aria-label="면접 접수">
          <p className="text-[12px] text-faint">{c.category}</p>
          <p className="mt-0.5 text-[17px] font-extrabold text-navy">{c.name} 모의면접</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            이 기업의 연습 질문 {c.questionCount}개 중에서 면접관이 질문을 고르고, 답변에 따라 꼬리질문을 이어 갑니다.
          </p>
          {tracks.length > 1 && (
            <div className="mt-4">
              <p className="label mb-1.5">지원 트랙</p>
              <div className="flex flex-wrap gap-1.5">
                {tracks.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={track === t}
                    onClick={() => setTrack(t)}
                    className={`rounded-full border px-3 py-1 text-[12px] ${track === t ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"}`}
                  >
                    {t === "공통" ? "전체" : t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => onStart(c.id, track)}>
            이 기업으로 면접 보기
          </Button>
          <p className="mt-2 text-center text-[11px] text-faint">다음 화면에서 직무와 서류를 고릅니다.</p>
        </aside>
      </main>
    </div>
  );
}
