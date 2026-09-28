import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InterviewHistory } from "../components/InterviewHistory";
import { CompanyCard } from "../components/CompanyCard";
import { COMPANIES, COMPANY_CATEGORIES } from "../../shared/companies";
import { InterviewRoom, type RoomMode } from "../components/InterviewRoom";
import { ModeBadge, TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { ArrowIcon } from "../components/ui/icons";
import { DISCLAIMER } from "../config/options";
import { buildPanel, type Seat } from "../config/panel";
import type { ProviderStatus } from "../services/ai/providerFactory";
import type { InterviewSummary } from "../types/interview";
import type { ActiveInterview } from "../utils/storage";
import { INTERVIEW_TYPE_KO } from "../config/labelsKo";
import { longDate } from "../utils/format";

const FEATURES = [
  { title: "꼬리질문", body: "내 답변에서 말한 내용을 짚어 다시 묻습니다." },
  { title: "다대일 면접", body: "인사·팀장·실무 면접관 3인이 번갈아 질문합니다." },
  { title: "음성 면접", body: "질문을 음성으로 듣고, 말로 답할 수 있어요." },
  { title: "면접 평가표", body: "항목별 점수·등급, 질문별 개선 방향까지." },
];

const STEPS = ["면접 접수", "대기실 · 호명", "면접 진행", "평가표 확인"];

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
    <div className="relative w-full overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_24px_60px_-28px_rgba(23,35,59,0.45)]" aria-hidden>
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
                  · {speaker.role}
                </>
              ) : (
                <b className="text-good">지원자 (나)</b>
              )}
              {line.tag && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">↳ {line.tag}</span>}
            </p>
            <p className={`mt-1 text-[15px] leading-relaxed ${line.mode === "reviewing" ? "text-faint" : "font-semibold text-ink"}`}>
              {line.who === "right" ? (
                <>
                  그 <mark className="rounded bg-[#fff1b8] px-1 text-ink">성능 문제</mark>의 원인은 구체적으로 어떻게 찾으셨나요?
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
  const answered = i.questions.filter((q) => q.answer).length;
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
          {i.config.position} · {INTERVIEW_TYPE_KO[i.config.interviewType]} · {answered}/{i.config.questionLimit}문항 답변 · {longDate(active.savedAt)} 저장
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
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.15fr] lg:py-14">
          <div className="text-center lg:text-left">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-accent">
              AI 모의면접실
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5 }}
              className="mt-3 text-[32px] leading-tight font-extrabold tracking-tight text-navy sm:text-5xl sm:leading-tight"
            >
              실제 면접장처럼,
              <br />
              AI 면접관과 연습하세요
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5 text-[16px] leading-relaxed text-muted">
              면접관 3인이 내 답변을 듣고 다시 파고듭니다.
              <br className="hidden sm:inline" /> 면접이 끝나면 항목별 <b className="text-ink">면접 평가표</b>를 받아보세요.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-col items-center gap-2.5 lg:items-start">
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <Button variant="primary" size="lg" onClick={onStart} icon={<ArrowIcon width={18} height={18} />} className="flex-row-reverse px-10">
                  면접 시작하기
                </Button>
                {COMPANIES.length > 0 && (
                  <Button variant="secondary" size="lg" onClick={onCompanies} className="px-6">
                    기업별 면접 보기
                  </Button>
                )}
              </div>
              <span className="text-[13px] text-faint">
                {status?.mode === "mock" ? "API 키 없이 MOCK 면접관으로 바로 체험할 수 있어요." : status?.mode === "ai" ? "실제 AI 면접관이 연결되어 있습니다." : "면접관 연결 상태를 확인하는 중…"}
              </span>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <RoomPreview />
          </motion.div>
        </section>

        <section aria-label="진행 순서" className="mb-6">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 rounded-lg bg-surface-3/70 px-3.5 py-2.5 text-[13px] font-semibold text-ink">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy font-mono text-[11px] text-white">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid grid-cols-2 gap-3 pb-10 md:grid-cols-4" aria-label="주요 기능">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-surface px-4 py-4">
              <p className="text-[15px] font-bold text-ink">{f.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        {FEATURED.length > 0 && (
          <section className="pb-10" aria-label="기업별 모의면접">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">기업별 모의면접</h2>
                <p className="text-[13px] text-muted">
                  {COMPANIES.length}개 기업·기관의 인재상, 면접 전형, 기출 기반 질문으로 연습해 보세요.
                </p>
              </div>
              <button type="button" onClick={onCompanies} className="shrink-0 text-[13px] text-muted hover:text-ink">
                전체 보기 ›
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
                전체 보기 ›
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
