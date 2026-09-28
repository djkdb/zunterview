import { motion } from "framer-motion";
import type { Interview } from "../types/interview";
import { durationLabel } from "../utils/format";

export function CompletionScreen({ interview }: { interview: Interview }) {
  const answered = interview.questions.length;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg px-6" role="status" aria-live="polite">
      <div className="text-center">
        <motion.p className="label text-accent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {interview.endedEarly ? "Interview ended" : "All questions answered"}
        </motion.p>
        <motion.h1
          className="mt-4 font-mono text-3xl tracking-[0.18em] text-ink sm:text-5xl"
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.18em" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          INTERVIEW COMPLETE
        </motion.h1>
        <motion.div className="mt-6 flex justify-center gap-8 font-mono text-xs text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <span>
            <span className="block text-2xl text-ink tabular-nums">{answered}</span>ANSWERS
          </span>
          <span>
            <span className="block text-2xl text-ink tabular-nums">{durationLabel(interview.duration)}</span>DURATION
          </span>
        </motion.div>
        <motion.div className="mx-auto mt-10 w-56" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <p className="mb-3 text-sm text-muted">Compiling your feedback report…</p>
          <div className="h-[2px] overflow-hidden rounded bg-white/10">
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
