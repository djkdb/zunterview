/**
 * The AI interviewer "presence": an abstract orb whose motion explains what
 * the interviewer is doing — asking, listening, thinking, analyzing.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { INTERVIEWER_NAME } from "../config/options";

export type InterviewerStatus = "IDLE" | "ASKING" | "LISTENING" | "THINKING" | "ANALYZING";

const STATUS_COPY: Record<InterviewerStatus, { label: string; color: string }> = {
  IDLE: { label: "READY", color: "bg-faint" },
  ASKING: { label: "ASKING", color: "bg-accent" },
  LISTENING: { label: "LISTENING", color: "bg-good" },
  THINKING: { label: "THINKING", color: "bg-accent-2" },
  ANALYZING: { label: "ANALYZING", color: "bg-warn" },
};

interface Props {
  status: InterviewerStatus;
  /** 0-1 — how much the candidate is "talking" (typing/recording), drives the waveform. */
  activity?: number;
  size?: "sm" | "lg";
  speaking?: boolean;
}

export function AIInterviewer({ status, activity = 0, size = "lg", speaking = false }: Props) {
  const reduce = useReducedMotion();
  const px = size === "lg" ? 176 : 96;
  const asking = status === "ASKING";

  return (
    <div className="flex flex-col items-center" aria-live="polite">
      <div className="relative" style={{ width: px, height: px }}>
        {/* ambient glow */}
        <motion.div
          className="absolute inset-[-30%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,124,246,0.35), transparent 65%)" }}
          animate={
            reduce
              ? { opacity: asking ? 0.9 : 0.5 }
              : { opacity: asking ? [0.55, 1, 0.55] : status === "LISTENING" ? 0.45 : [0.35, 0.55, 0.35], scale: asking ? [1, 1.08, 1] : 1 }
          }
          transition={{ duration: asking ? 1.6 : 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* outer ring */}
        <motion.svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" />
          {status === "ANALYZING" && (
            <motion.circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="url(#scan)"
              strokeWidth="1.4"
              strokeDasharray="60 242"
              strokeLinecap="round"
              style={{ originX: "50%", originY: "50%" }}
              animate={reduce ? {} : { rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          )}
          {status === "THINKING" && (
            <motion.circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(108,140,255,0.55)"
              strokeWidth="0.8"
              strokeDasharray="2 6"
              style={{ originX: "50%", originY: "50%" }}
              animate={reduce ? {} : { rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          )}
          <defs>
            <linearGradient id="scan" x1="0" x2="1">
              <stop offset="0" stopColor="#e6b56c" stopOpacity="0" />
              <stop offset="1" stopColor="#e6b56c" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* core orb */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "16%",
            background:
              "radial-gradient(circle at 35% 30%, #d9d2ff 0%, #9c8ff8 28%, #6a5fd8 58%, #2a2a6e 100%)",
            boxShadow: "inset -8px -12px 24px rgba(10,10,30,0.6), 0 0 40px rgba(139,124,246,0.35)",
          }}
          animate={
            reduce
              ? {}
              : asking && speaking
                ? { scale: [1, 1.05, 0.99, 1.04, 1] }
                : status === "THINKING"
                  ? { scale: [1, 0.97, 1] }
                  : { scale: [1, 1.03, 1] }
          }
          transition={{ duration: asking && speaking ? 0.9 : status === "THINKING" ? 1.2 : 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 40%)" }} />
          <AnimatePresence>
            {status === "THINKING" && (
              <motion.div className="absolute inset-0 flex items-center justify-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-white/90"
                    animate={reduce ? {} : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* waveform / speaking bars */}
      <div className="mt-5 flex h-8 items-center gap-[3px]" aria-hidden>
        {Array.from({ length: 21 }).map((_, i) => {
          const center = 1 - Math.abs(i - 10) / 11;
          const listening = status === "LISTENING";
          const amp = asking ? 0.35 + center * 0.65 : listening ? 0.12 + activity * center * 0.9 : 0.08;
          return (
            <motion.span
              key={i}
              className={`w-[3px] rounded-full ${listening ? "bg-good/80" : asking ? "bg-accent" : "bg-white/15"}`}
              animate={
                reduce || (!asking && !(listening && activity > 0))
                  ? { height: 4 + amp * 10 }
                  : { height: [4, 4 + amp * 26, 6 + amp * 8, 4 + amp * 20, 4] }
              }
              transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.05 }}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-col items-center gap-1.5">
        <span className="font-mono text-[13px] tracking-[0.3em] text-ink">{INTERVIEWER_NAME}</span>
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2/80 px-3 py-1">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COPY[status].color} ${status !== "IDLE" && !reduce ? "animate-pulse" : ""}`} />
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted" role="status">
            {STATUS_COPY[status].label}
          </span>
        </span>
      </div>
    </div>
  );
}
