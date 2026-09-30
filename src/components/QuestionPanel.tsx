import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Copy } from "../config/copy";
import { QUESTION_TYPE_KO } from "../config/labelsKo";
import { ORIGIN_LABEL } from "../config/origin";
import type { PanelMember } from "../config/panel";
import type { Phase, ProcessingStage } from "../state/interviewMachine";
import type { InterviewQuestion } from "../types/interview";
import { pad2 } from "../utils/format";

interface Props {
  question: InterviewQuestion | null;
  index: number;
  phase: Phase;
  stage: ProcessingStage | null;
  transitionText: string | null;
  /** Interviewer asking the current question / reacting. */
  speaker: PanelMember;
  copy: Copy;
  /** Replay the question aloud (shown when speech output exists). */
  onRepeat?: () => void;
}

function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.04, duration: 0.3, ease: "easeOut" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}

function Speaker({ m }: { m: PanelMember }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.look.suit }} aria-hidden>
        {m.name[0]}
      </span>
      <span className="text-[13px] text-muted">
        <b className="font-semibold text-ink">
          {m.name} {m.title}
        </b>{" "}
        · {m.role}
      </span>
    </span>
  );
}

/** Subtitle-style card: who is asking and what. */
export function QuestionPanel({ question, index, phase, stage, transitionText, speaker, copy, onRepeat }: Props) {
  const transitioning = phase === "FOLLOW_UP" || phase === "NEXT_QUESTION";
  const analyzing = phase === "ANALYZING";
  const stageIdx = stage === "submitted" ? 0 : stage === "thinking" ? 1 : stage === "analyzing" ? 2 : -1;

  return (
    <section aria-label="현재 질문" lang={copy.lang} className="w-full">
      <AnimatePresence mode="wait">
        {transitioning ? (
          <motion.div key="transition" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="rounded-xl border border-line bg-surface px-5 py-4 shadow-sm">
            <Speaker m={speaker} />
            <p className="mt-2.5 text-lg leading-relaxed text-ink sm:text-xl">
              “<Words text={transitionText ?? ""} />”
            </p>
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold ${
                phase === "FOLLOW_UP" ? "bg-accent-soft text-accent" : "bg-surface-3 text-muted"
              }`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {phase === "FOLLOW_UP" ? `이어서 ${copy.followUp}` : copy.nextQuestion}
            </span>
          </motion.div>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`rounded-xl border bg-surface px-5 py-4 shadow-sm transition-colors ${question.isFollowUp && !analyzing ? "border-accent/40" : "border-line"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Speaker m={speaker} />
              <span className="flex items-center gap-1.5">
                <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted">Q{pad2(index)}</span>
                <span className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">{QUESTION_TYPE_KO[question.type]}</span>
                {question.origin && (
                  <span className="rounded-md bg-[#dde6f3] px-2 py-0.5 text-[11px] font-semibold text-ink" title={ORIGIN_LABEL[question.origin].title}>
                    {ORIGIN_LABEL[question.origin].label}
                  </span>
                )}
                {question.isFollowUp && (
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
                    className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white"
                  >
                    ↳ {copy.followUp}
                  </motion.span>
                )}
              </span>
            </div>

            {question.reaction && !analyzing && <p className="mt-3 text-[14px] text-faint">“{question.reaction}”</p>}

            <h1 className={`mt-2 font-bold tracking-tight text-ink transition-all ${analyzing ? "text-base text-muted sm:text-lg" : "text-[20px] leading-snug sm:text-2xl lg:text-[28px] lg:leading-snug"}`}>
              <Words text={question.text} delay={0.05} />
            </h1>

            {!analyzing && ((question.isFollowUp && question.anchor) || (onRepeat && !question.answer)) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {question.isFollowUp && question.anchor ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[13px] text-muted">
                    {copy.pickingUp} <mark className="rounded bg-[#dde6f3] px-1.5 py-0.5 font-semibold text-ink">“{question.anchor}”</mark>
                  </motion.p>
                ) : (
                  <span />
                )}
                {onRepeat && !question.answer && (
                  <button type="button" onClick={onRepeat} className="rounded-md px-2 py-1 text-[12px] text-muted hover:bg-surface-3 hover:text-ink">
                    🔊 {copy.repeat}
                  </button>
                )}
              </div>
            )}

            {analyzing && (
              <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label="답변 처리 단계">
                {copy.stages.map((label, i) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-[13px] transition-colors ${i < stageIdx ? "text-good" : i === stageIdx ? "font-semibold text-ink" : "text-faint"}`}>
                      <span className={`h-2 w-2 rounded-full ${i < stageIdx ? "bg-good" : i === stageIdx ? "animate-pulse bg-accent" : "bg-line-strong"}`} />
                      {label}
                    </span>
                    {i < copy.stages.length - 1 && <span className="h-px w-4 bg-line-strong sm:w-8" />}
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
