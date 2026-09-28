import { motion } from "framer-motion";
import type { InterviewQuestion } from "../types/interview";
import { pad2 } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { TONE_BG } from "../utils/tones";

interface Props {
  questions: InterviewQuestion[];
  total: number;
  /** Colour answered slots by score (only when live feedback is on). */
  showScores: boolean;
}

/** One slot per question: done / current / upcoming, with follow-ups marked. */
export function QuestionStepper({ questions, total, showScores }: Props) {
  const current = questions.length - 1;
  return (
    <nav aria-label="문항 진행" className="flex items-center gap-3">
      <ol className="flex flex-1 items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const q = questions[i];
          const done = Boolean(q?.answer);
          const isCurrent = i === current && !done;
          const tone = done && showScores && q.score !== null ? TONE_BG[scoreTone(q.score)] : done ? "bg-navy" : "";
          return (
            <li
              key={i}
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line-strong/60"
              aria-label={`${i + 1}번 문항${q?.isFollowUp ? " (꼬리질문)" : ""}: ${done ? "답변 완료" : isCurrent ? "진행 중" : "대기"}`}
            >
              {done && <motion.span className={`absolute inset-0 ${tone}`} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.4 }} />}
              {isCurrent && <span className="absolute inset-0 animate-pulse bg-accent/60" />}
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 font-mono text-[12px] text-muted tabular-nums">
        <b className="text-ink">{pad2(Math.max(1, questions.length))}</b> / {pad2(total)}
        {questions.some((q) => q.isFollowUp) && (
          <span className="ml-2 font-sans text-faint">꼬리질문 {questions.filter((q) => q.isFollowUp).length}</span>
        )}
      </span>
    </nav>
  );
}
