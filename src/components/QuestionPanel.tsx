import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QUESTION_TYPE_LABEL } from "../../shared/labels";
import type { Copy } from "../config/copy";
import type { Phase, ProcessingStage } from "../state/interviewMachine";
import type { InterviewQuestion } from "../types/interview";
import { pad2 } from "../utils/format";

interface Props {
  question: InterviewQuestion | null;
  index: number;
  phase: Phase;
  stage: ProcessingStage | null;
  transitionText: string | null;
  copy: Copy;
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
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.045, duration: 0.35, ease: "easeOut" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}

export function QuestionPanel({ question, index, phase, stage, transitionText, copy }: Props) {
  const transitioning = phase === "FOLLOW_UP" || phase === "NEXT_QUESTION";
  const analyzing = phase === "ANALYZING";
  const stageIdx = stage === "submitted" ? 0 : stage === "thinking" ? 1 : stage === "analyzing" ? 2 : -1;

  return (
    <section aria-label="Current question" lang={copy.lang} className="relative min-h-[150px] w-full">
      <AnimatePresence mode="wait">
        {transitioning ? (
          <motion.div
            key="transition"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <p className="max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              <Words text={transitionText ?? ""} />
            </p>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase ${
                phase === "FOLLOW_UP" ? "border-accent/50 bg-accent-soft text-accent" : "border-line-strong text-muted"
              }`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {phase === "FOLLOW_UP" ? copy.followUp : copy.nextQuestion}
            </motion.span>
          </motion.div>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: analyzing ? 0.55 : 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono text-[11px] tracking-[0.2em] text-faint">Q{pad2(index)}</span>
              <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                {QUESTION_TYPE_LABEL[question.type]}
              </span>
              {question.isFollowUp && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
                  className="rounded-full border border-accent/50 bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-accent uppercase"
                >
                  ↳ {copy.followUp}
                </motion.span>
              )}
            </div>

            {question.reaction && !analyzing && (
              <p className="mb-3 max-w-2xl text-sm text-faint sm:text-base">{question.reaction}</p>
            )}

            <h1 className={`max-w-3xl font-semibold tracking-tight text-ink ${analyzing ? "text-lg sm:text-xl" : "text-[22px] leading-snug sm:text-3xl sm:leading-snug lg:text-[34px]"}`}>
              <Words text={question.text} delay={0.1} />
            </h1>

            {question.isFollowUp && question.anchor && !analyzing && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-4 text-xs text-muted"
              >
                <span className="font-mono tracking-[0.14em] text-faint uppercase">{copy.pickingUp}</span>{" "}
                <mark className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">“{question.anchor}”</mark>
              </motion.p>
            )}

            {analyzing && (
              <ol className="mt-6 flex items-center gap-2 sm:gap-3" aria-label="Processing">
                {copy.stages.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 sm:gap-3">
                    <span
                      className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-300 sm:text-[11px] ${
                        i < stageIdx ? "text-good" : i === stageIdx ? "text-ink" : "text-faint"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${i < stageIdx ? "bg-good" : i === stageIdx ? "animate-pulse bg-accent" : "bg-white/15"}`} />
                      {label}
                    </span>
                    {i < copy.stages.length - 1 && <span className="h-px w-3 bg-line-strong sm:w-6" />}
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
