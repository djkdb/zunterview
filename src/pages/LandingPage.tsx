import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InterviewHistory } from "../components/InterviewHistory";
import { CompanyCard } from "../components/CompanyCard";
import { COMPANIES, COMPANY_CATEGORIES } from "../../shared/companies";
import { InterviewRoom, type RoomMode } from "../components/InterviewRoom";
import { ModeBadge, TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { DISCLAIMER } from "../config/options";
import { buildPanel, type Seat } from "../config/panel";
import type { ProviderStatus } from "../services/ai/providerFactory";
import type { InterviewSummary } from "../types/interview";
import type { ActiveInterview } from "../utils/storage";
import { INTERVIEW_TYPE_KO } from "../config/labelsKo";
import { longDate } from "../utils/format";

/** How follow-ups differ by job: the phrase the candidate said, and what the panel asks next. */
const FOLLOW_UPS: { job: string; answer: string; anchor: string; ask: string }[] = [
  { job: "회계", answer: "월 결산 기간을 7영업일에서 5영업일로 줄였습니다.", anchor: "5영업일", ask: "줄어든 이틀은 결산의 어느 단계에서 나왔나요?" },
  { job: "간호", answer: "낙상 고위험 환자 체크리스트를 인수인계에 넣자고 제안했습니다.", anchor: "인수인계", ask: "제안한 뒤 인수인계 방식이 실제로 어떻게 바뀌었나요?" },
  { job: "마케팅", answer: "신규 고객 유입 캠페인을 3개월간 운영했습니다.", anchor: "신규 고객 유입", ask: "그 캠페인은 어떤 지표로 성공을 판단했나요?" },
];

const STEPS = ["면접 접수", "대기실에서 호명", "면접", "평가표"];

const SCRIPT: { who: Seat | "me"; text: string; mode: RoomMode; tag?: string }[] = [
  { who: "center", text: "가장 어려웠던 프로젝트 하나를 설명해주세요.", mode: "asking" },
  { who: "me", text: "팀 프로젝트에서 성능 문제를 해결했습니다.", mode: "listening" },
  { who: "center", text: "면접관들이 답변을 검토하고 있습니다…", mode: "reviewing" },
  { who: "right", text: "그 성능 문제의 원인은 구체적으로 어떻게 찾으셨나요?", mode: "asking", tag: "꼬리질문" },
];

/** Looping preview of the core moment inside the room. */
function RoomPreview() {
  const reduce = useReducedMotion();
  const panel = useMemo(() => buildPanel("프론트엔드 개발자"), []);
  const [step, setStep] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), [2600, 2400, 1600, 3600][step]);
    return () => clearTimeout(t);
  }, [step, reduce]);
  const line = SCRIPT[step];
  const speaker = line.who === "me" ? null : panel[line.who];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_24px_60px_-28px_rgba(15,27,46,0.45)]" aria-hidden>
      <div className="h-[230px] sm:h-[300px]">
        <InterviewRoom panel={panel} speaking={line.who === "me" ? null : line.who} mode={line.mode} activity={line.who === "me" ? 1 : 0} />
      </div>
      <div className="min-h-[92px] border-t border-line px-5 py-3.5">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="flex items-center gap-2 text-[12px] text-muted">
              {speaker ? (
                <>
                  <b className="text-ink">
                    {speaker.name} {speaker.title}
                  </b>
                  <span>{speaker.role}</span>
                </>
              ) : (
                <b className="text-good">지원자 (나)</b>
              )}
              {line.tag && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">↳ {line.tag}</span>}
            </p>
            <p className={`mt-1 text-[15px] leading-relaxed ${line.mode === "reviewing" ? "text-faint" : "font-semibold text-ink"}`}>
              {line.who === "right" ? (
                <>
                  그 <mark className="rounded bg-[#dde6f3] px-1 text-ink">성능 문제</mark>의 원인은 구체적으로 어떻게 찾으셨나요?
                </>
              ) : (
                line.text
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface Props {
  status: ProviderStatus | null;
  history: InterviewSummary[];
  onStart: () => void;
  onHistory: () => void;
  onCompanies: () => void;
  onOpenCompany: (id: string) => void;
  onOpenInterview: (id: string) => void;
  canOpen: (id: string) => boolean;
  active: ActiveInterview | null;
  onResume: () => void;
  onDiscard: () => void;
}

function ResumeBanner({ active, onResume, onDiscard }: { active: ActiveInterview; onResume: () => void; onDiscard: () => void }) {
  const i = active.interview;
  const answered = i.questions.filter((q) => q.answer && !q.isFollowUp).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role="region"
      aria-label="진행 중인 면접"
      className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-accent/30 bg-accent-soft px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-accent">진행 중이던 면접이 있습니다</p>
        <p className="mt-0.5 text-[13px] text-muted">
          {i.config.position} {INTERVIEW_TYPE_KO[i.config.interviewType]}, {i.config.questionLimit}문항 중 {answered}문항까지 답했습니다. ({longDate(active.savedAt)} 저장)
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          삭제
        </Button>
        <Button size="sm" variant="primary" onClick={onResume}>
          이어서 면접 보기
        </Button>
      </div>
    </motion.div>
  );
}

/** A couple from each category so the section shows the range. */
const FEATURED = COMPANY_CATEGORIES.flatMap((cat) => COMPANIES.filter((c) => c.category === cat).slice(0, 2)).slice(0, 8);

export function LandingPage({ status, history, onStart, onHistory, onCompanies, onOpenCompany, onOpenInterview, canOpen, active, onResume, onDiscard }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        onHome={() => undefined}
        modeBadge={<ModeBadge mode={status?.mode ?? null} detail={status?.model ?? undefined} />}
        right={
          <>
            {COMPANIES.length > 0 && (
              <Button size="sm" variant="ghost" onClick={onCompanies}>
                기업별 면접
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onHistory}>
              <span className="hidden sm:inline">나의 </span>면접 기록
            </Button>
          </>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        {active && <ResumeBanner active={active} onResume={onResume} onDiscard={onDiscard} />}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.15fr] lg:py-16">
          <div className="text-center lg:text-left">
            <h1 className="text-[30px] leading-[1.25] font-extrabold tracking-tight text-navy sm:text-[44px]">
              면접관 셋이 내 답을 듣고
              <br />
              다시 묻습니다
            </h1>
            <p className="mx-auto mt-5 max-w-[34em] text-[16px] leading-relaxed text-muted lg:mx-0">
              직무를 고르고 답하면 방금 한 말에서 꼬리질문이 나옵니다. 면접이 끝나면 항목별 점수와 문항마다 고칠 점이 적힌 평가표를 드립니다.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <Button variant="primary" size="lg" onClick={onStart} className="px-10">
                  면접 접수하기
                </Button>
                {COMPANIES.length > 0 && (
                  <Button variant="secondary" size="lg" onClick={onCompanies} className="px-6">
                    기업별 질문 보기
                  </Button>
                )}
              </div>
              <ol className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-faint lg:justify-start" aria-label="진행 순서">
                {STEPS.map((step, i) => (
                  <li key={step}>
                    <span className="text-muted tabular-nums">{i + 1}</span> {step}
                  </li>
                ))}
              </ol>
              <span className="text-[13px] text-faint">
                {status?.mode === "mock" ? "API 키 없이도 연습용 면접관(MOCK)으로 바로 볼 수 있습니다." : status?.mode === "ai" ? "AI 면접관이 연결되어 있습니다." : "면접관 연결을 확인하고 있습니다."}
              </span>
            </div>
          </div>
          <RoomPreview />
        </section>

        <section className="pb-12" aria-labelledby="follow-up-title">
          <h2 id="follow-up-title" className="text-base font-bold text-ink">
            직무마다 파고드는 곳이 다릅니다
          </h2>
          <p className="mt-1 text-[13px] text-muted">답변에 나온 말을 붙잡아 그 직무의 면접관이 확인할 만한 것을 묻습니다. 아래는 예시입니다.</p>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {FOLLOW_UPS.map((f) => {
              const [before, after] = f.answer.split(f.anchor);
              return (
                <li key={f.job} className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[5rem_1fr_1fr] sm:items-baseline">
                  <span className="text-[13px] font-bold text-accent">{f.job}</span>
                  <p className="text-[14px] leading-relaxed text-muted">
                    <span className="sr-only">지원자: </span>
                    {before}
                    <mark className="rounded bg-[#dde6f3] px-0.5 text-ink">{f.anchor}</mark>
                    {after}
                  </p>
                  <p className="text-[14px] leading-relaxed font-semibold text-ink">
                    <span className="mr-1.5 text-accent" aria-label="꼬리질문">↳</span>
                    {f.ask}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {FEATURED.length > 0 && (
          <section className="pb-10" aria-label="기업별 모의면접">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">기업별 모의면접</h2>
                <p className="text-[13px] text-muted">
                  {COMPANIES.length}개 기업·기관의 인재상과 면접 전형, 공개 후기에서 가져온 연습 질문이 있습니다.
                </p>
              </div>
              <button type="button" onClick={onCompanies} className="shrink-0 text-[13px] text-muted hover:text-ink">
                기업 전체 보기
              </button>
            </div>
            <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
              {FEATURED.map((c) => (
                <li key={c.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                  <CompanyCard c={c} onClick={() => onOpenCompany(c.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pb-12" aria-label="최근 면접">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">최근 면접</h2>
            {history.length > 3 && (
              <button type="button" onClick={onHistory} className="text-[13px] text-muted hover:text-ink">
                기록 전체 보기
              </button>
            )}
          </div>
          <InterviewHistory items={history.slice(0, 3)} onOpen={onOpenInterview} onStart={onStart} canOpen={canOpen} compact />
        </section>
      </main>
      <footer className="border-t border-line py-5 text-center text-[12px] text-faint">{DISCLAIMER}</footer>
    </div>
  );
}
