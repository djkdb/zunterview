import { motion } from "framer-motion";
import { buildPanel } from "../config/panel";
import type { Interview } from "../types/interview";
import { durationLabel } from "../utils/format";
import { InterviewRoom } from "./InterviewRoom";

export function CompletionScreen({ interview }: { interview: Interview }) {
  const answered = interview.questions.length;
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" role="status" aria-live="polite">
      <div className="h-[38vh] min-h-[200px] w-full overflow-hidden border-b border-line opacity-90">
        <InterviewRoom panel={buildPanel(interview.config.position)} speaking={null} mode="reviewing" />
      </div>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <motion.p className="text-sm font-semibold text-accent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {interview.endedEarly ? "면접이 조기 종료되었습니다" : "모든 질문에 답변하셨습니다"}
          </motion.p>
          <motion.h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            면접이 종료되었습니다
          </motion.h1>
          <motion.p className="mt-2 text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            수고 많으셨습니다. 안녕히 가세요.
          </motion.p>
          <motion.div className="mt-6 flex justify-center gap-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <span className="text-sm text-muted">
              <span className="block font-mono text-2xl font-semibold text-ink tabular-nums">{answered}</span>답변 문항
            </span>
            <span className="text-sm text-muted">
              <span className="block font-mono text-2xl font-semibold text-ink tabular-nums">{durationLabel(interview.duration)}</span>소요 시간
            </span>
          </motion.div>
          <motion.div className="mx-auto mt-8 w-64" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <p className="mb-2.5 text-sm text-muted">면접위원이 평가표를 작성하고 있습니다…</p>
            <div className="h-1 overflow-hidden rounded bg-surface-3">
              <motion.div className="h-full w-1/3 bg-accent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
