import { AnimatePresence, motion } from "framer-motion";
import type { Copy } from "../config/copy";
import type { InterviewQuestion } from "../types/interview";
import { pad2 } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  questions: InterviewQuestion[];
  liveFeedback: boolean;
  copy: Copy;
}

/** Running transcript of the interview — shows how each follow-up came from an answer. */
export function InterviewNotes({ questions, liveFeedback, copy }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-ink">면접 기록</h2>
        <span className="text-[12px] text-faint">답변 {questions.filter((q) => q.answer).length}개</span>
      </div>
      <ol lang={copy.lang} className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {questions.length === 0 && <li className="px-2 py-6 text-center text-sm text-faint">면접이 진행되면 질문과 답변이 여기에 기록됩니다.</li>}
        <AnimatePresence initial={false}>
          {questions.map((q, i) => (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-lg px-3 py-3 ${q.isFollowUp ? "ml-4 border-l-2 border-accent/30" : ""} ${!q.answer ? "bg-accent-soft" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-faint">Q{pad2(i + 1)}</span>
                {q.isFollowUp && <span className="text-[11px] font-semibold text-accent">↳ {copy.followUp}</span>}
                {liveFeedback && q.score !== null && (
                  <span className="ml-auto">
                    <ScoreBadge score={q.score} tone={scoreTone(q.score)} small />
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-snug font-medium text-ink">{q.text}</p>
              {q.isFollowUp && q.followUpReason && (
                <p className="mt-1.5 text-[11px] leading-snug text-faint">
                  <span className="text-accent">{copy.whyFollowUp}:</span> {q.followUpReason}
                </p>
              )}
              {q.answer && <p className="mt-2 line-clamp-2 border-l-2 border-line-strong pl-2 text-[12px] leading-snug text-muted">{q.answer}</p>}
              {liveFeedback && q.feedback && (
                // A weak answer has no strength worth a "+" — show what to fix instead.
                (q.score ?? 0) >= 45 ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-good">+ {q.feedback.strength}</p>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-snug text-warn">− {q.feedback.improve}</p>
                )
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
