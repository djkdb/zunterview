import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InterviewHistory } from "../components/InterviewHistory";
import { ModeBadge, TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { ArrowIcon } from "../components/ui/icons";
import { DISCLAIMER } from "../config/options";
import type { ProviderStatus } from "../services/ai/providerFactory";
import type { InterviewSummary } from "../types/interview";

const FEATURES = [
  { title: "AI Follow-up", body: "Digs into what you actually said." },
  { title: "Real-time Feedback", body: "Notes and scores as you go." },
  { title: "Voice Interview", body: "Speak your answers, hear the questions." },
  { title: "Detailed Analysis", body: "STAR, six categories, better-answer tips." },
];

/** Looping preview of the core moment: answer → the AI digs deeper. */
function ConversationPreview() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 4 : 0);
  useEffect(() => {
    if (reduce) return;
    const durations = [1400, 1600, 1300, 1400, 3800];
    const t = setTimeout(() => setStep((s) => (s + 1) % 5), durations[step]);
    return () => clearTimeout(t);
  }, [step, reduce]);

  return (
    <div lang="ko" className="w-full max-w-md rounded-3xl border border-line bg-surface/70 p-5 text-left shadow-[0_30px_80px_-30px_rgba(139,124,246,0.35)] backdrop-blur sm:p-6" aria-hidden>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted">ALEX · AI INTERVIEWER</span>
      </div>
      <div className="min-h-[216px] space-y-3 text-[14px] leading-relaxed">
        <AnimatePresence>
          {step >= 0 && (
            <motion.p key="q1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-ink">
              가장 어려웠던 프로젝트를 설명해주세요.
            </motion.p>
          )}
          {step >= 1 && (
            <motion.p key="a1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-6 rounded-2xl rounded-tr-sm bg-white/[0.05] px-3.5 py-2.5 text-muted">
              팀 프로젝트에서 <span className="text-ink">성능 문제</span>를 해결했습니다.
            </motion.p>
          )}
          {step === 2 && (
            <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-accent-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-accent-2" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </span>
              THINKING
            </motion.div>
          )}
          {step >= 3 && (
            <motion.div key="f1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="mb-1.5 inline-block rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] text-accent">↳ FOLLOW-UP</span>
              <p className="text-ink">
                <mark className="rounded bg-accent-soft px-1 text-accent">성능 문제</mark>가 발생한 원인을 구체적으로 어떻게 찾았나요?
              </p>
            </motion.div>
          )}
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
  onOpenInterview: (id: string) => void;
  canOpen: (id: string) => boolean;
}

export function LandingPage({ status, history, onStart, onHistory, onOpenInterview, canOpen }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        onHome={() => undefined}
        modeBadge={<ModeBadge mode={status?.mode ?? null} detail={status?.model ?? undefined} />}
        right={
          <Button size="sm" variant="ghost" onClick={onHistory}>
            History
          </Button>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        <section className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div className="text-center lg:text-left">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="label text-accent">
              AI Mock Interview
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.6 }}
              className="mt-4 font-mono text-[40px] leading-none font-medium tracking-tight text-ink sm:text-6xl lg:text-7xl"
            >
              INTERVIEW<span className="text-accent">//</span>AI
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 text-xl text-ink sm:text-2xl">
              Your interviewer adapts to your answers.
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 text-[15px] leading-relaxed text-muted">
              AI가 질문만 하는 것이 아니라, 내 답변을 듣고 다시 파고듭니다.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-9 flex flex-col items-center gap-3 lg:items-start">
              <Button variant="primary" size="lg" onClick={onStart} icon={<ArrowIcon width={16} height={16} />} className="flex-row-reverse">
                Start Interview
              </Button>
              <span className="text-xs text-faint">
                {status?.mode === "mock" ? "Running in Mock Mode — no API key needed." : status?.mode === "ai" ? "Connected to a live AI interviewer." : "Checking AI connection…"}
              </span>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="flex justify-center lg:justify-end">
            <ConversationPreview />
          </motion.div>
        </section>

        <section className="grid grid-cols-2 gap-3 pb-10 md:grid-cols-4" aria-label="Features">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface/50 px-4 py-4">
              <p className="font-mono text-[11px] tracking-[0.14em] text-ink uppercase">{f.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-faint">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="pb-12" aria-label="Recent interviews">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label">Recent interviews</h2>
            {history.length > 3 && (
              <button type="button" onClick={onHistory} className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase hover:text-ink">
                View all
              </button>
            )}
          </div>
          <InterviewHistory items={history.slice(0, 3)} onOpen={onOpenInterview} onStart={onStart} canOpen={canOpen} compact />
        </section>
      </main>
      <footer className="border-t border-line py-5 text-center text-[11px] text-faint">{DISCLAIMER}</footer>
    </div>
  );
}
