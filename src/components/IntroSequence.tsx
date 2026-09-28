import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DIFFICULTY_LABEL, INTERVIEW_TYPE_LABEL } from "../../shared/labels";
import type { InterviewConfig } from "../types/interview";
import { CheckIcon } from "./ui/icons";

interface Props {
  config: InterviewConfig;
  engineLabel: string;
  voiceInput: boolean;
  voiceOutput: boolean;
  onDone: () => void;
}

type Step = "check" | "prep" | 3 | 2 | 1 | "go";

/** SYSTEM CHECK → Preparing → 3·2·1 → INTERVIEW STARTED (≈4.5s, skippable). */
export function IntroSequence({ config, engineLabel, voiceInput, voiceOutput, onDone }: Props) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("check");
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    const schedule: [Step | "end", number][] = reduce
      ? [["go", 500], ["end", 1100]]
      : [["prep", 1700], [3, 2300], [2, 2900], [1, 3500], ["go", 4100], ["end", 4800]];
    const timers = schedule.map(([s, t]) => setTimeout(() => (s === "end" ? finishRef.current() : setStep(s)), t));
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finishRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const checks: [string, string, boolean][] = [
    ["Interviewer", "ALEX", true],
    ["Engine", engineLabel, true],
    ["Position", config.position, true],
    ["Format", `${INTERVIEW_TYPE_LABEL[config.interviewType]} · ${DIFFICULTY_LABEL[config.difficulty]} · ${config.questionLimit} Q`, true],
    ["Voice output", voiceOutput ? "ON" : "OFF", voiceOutput],
    ["Voice input", voiceInput ? "AVAILABLE" : "TEXT MODE", voiceInput],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/95 backdrop-blur" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {step === "check" || step === "prep" ? (
          <motion.div key="check" className="w-full max-w-sm px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <p className="label mb-5 text-center text-accent">System Check</p>
            <ul className="space-y-2.5">
              {checks.map(([k, v, ok], i) => (
                <motion.li
                  key={k}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.18 }}
                  className="flex items-center gap-3 font-mono text-xs"
                >
                  <span className="w-28 shrink-0 tracking-[0.1em] text-faint uppercase">{k}</span>
                  <span className="h-px flex-1 border-b border-dashed border-line-strong" />
                  <span className={`max-w-[12rem] truncate ${ok ? "text-ink" : "text-muted"}`}>{v}</span>
                  <CheckIcon width={14} height={14} className={ok ? "text-good" : "text-faint"} />
                </motion.li>
              ))}
            </ul>
            <AnimatePresence>
              {step === "prep" && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center text-sm text-muted">
                  Preparing interview<span className="animate-pulse">…</span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : step === "go" ? (
          <motion.div key="go" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
            <p className="font-mono text-sm tracking-[0.4em] text-ink sm:text-base">INTERVIEW STARTED</p>
            <motion.div className="mx-auto mt-4 h-px bg-gradient-to-r from-transparent via-accent to-transparent" initial={{ width: 0 }} animate={{ width: 220 }} transition={{ duration: 0.6 }} />
          </motion.div>
        ) : (
          <motion.span
            key={step}
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.35 }}
            className="font-mono text-7xl font-light text-ink tabular-nums sm:text-8xl"
          >
            {step}
          </motion.span>
        )}
      </AnimatePresence>
      <button type="button" onClick={finish} className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-faint uppercase hover:text-ink">
        Skip ›
      </button>
    </div>
  );
}
