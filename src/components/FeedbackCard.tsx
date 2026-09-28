import { AnimatePresence, motion } from "framer-motion";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_LABEL, QUESTION_TYPE_LABEL } from "../../shared/labels";
import type { InterviewQuestion } from "../types/interview";
import { pad2 } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { ScoreBadge } from "./ScoreBadge";
import { TONE_TEXT } from "../utils/tones";
import { ChevronIcon } from "./ui/icons";

const STAR_MARK = { present: "✓", partial: "△", missing: "–" } as const;
const STAR_COLOR = { present: "text-good", partial: "text-warn", missing: "text-faint" } as const;

interface Props {
  q: InterviewQuestion;
  index: number;
  open: boolean;
  onToggle: () => void;
}

/** One row in QUESTION REVIEW: question → your answer → feedback → how to improve. */
export function FeedbackCard({ q, index, open, onToggle }: Props) {
  const f = q.feedback;
  if (!f || q.score === null) return null;
  const tone = scoreTone(q.score);
  const panelId = `review-${q.id}`;
  return (
    <li className={`rounded-2xl border transition-colors ${open ? "border-line-strong bg-surface" : "border-line bg-surface/50 hover:border-line-strong"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5">
        <span className="font-mono text-xs text-faint">Q{pad2(index)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {q.isFollowUp && <span className="font-mono text-[10px] tracking-[0.14em] text-accent uppercase">↳ Follow-up</span>}
            <span className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">{QUESTION_TYPE_LABEL[q.type]}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink sm:text-[15px]">{q.text}</span>
        </span>
        <span className={`font-mono text-xl tabular-nums ${TONE_TEXT[tone]}`}>{q.score}</span>
        <ChevronIcon className={`shrink-0 text-faint transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-line px-4 pt-4 pb-5 sm:px-5">
              <div>
                <p className="label mb-1.5">Question</p>
                <p className="text-[15px] text-ink">{q.text}</p>
                {q.isFollowUp && q.followUpReason && <p className="mt-1 text-xs text-faint">Why it was asked: {q.followUpReason}</p>}
              </div>
              <div>
                <p className="label mb-1.5">Your answer {q.answerMode === "voice" && <span className="text-accent">· voice</span>}</p>
                <p className="rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-muted">{q.answer}</p>
                {f.evidence.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="text-faint">Evidence used:</span>
                    {f.evidence.map((e) => (
                      <mark key={e} className="rounded bg-accent-soft px-1.5 text-accent">
                        “{e}”
                      </mark>
                    ))}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-good/20 bg-good/[0.05] p-3.5">
                  <p className="label mb-1 text-good/80">Strength</p>
                  <p className="text-sm text-ink/90">{f.strength}</p>
                </div>
                <div className="rounded-xl border border-warn/20 bg-warn/[0.05] p-3.5">
                  <p className="label mb-1 text-warn/80">Improve</p>
                  <p className="text-sm text-ink/90">{f.improve}</p>
                </div>
              </div>

              <div>
                <p className="label mb-2">Scores</p>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {CATEGORY_KEYS.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-xs">
                      <ScoreBadge score={f.scores[k].score} tone={scoreTone(f.scores[k].score)} small />
                      <span>
                        <span className="text-ink/90">{CATEGORY_LABEL[k]}</span> <span className="text-faint">— {f.scores[k].reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {f.star.applicable && (
                <div>
                  <p className="label mb-2">STAR structure</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["situation", "task", "action", "result"] as const).map((k) => (
                      <div key={k} className="rounded-xl border border-line bg-white/[0.02] p-2.5 text-center" title={f.star[k].note}>
                        <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                          <span className="text-ink">{k[0].toUpperCase()}</span>
                          <span className="hidden sm:inline">{k.slice(1)}</span>
                        </p>
                        <p className={`mt-1 text-lg ${STAR_COLOR[f.star[k].status]}`} aria-label={f.star[k].status}>
                          {STAR_MARK[f.star[k].status]}
                        </p>
                      </div>
                    ))}
                  </div>
                  {(["situation", "task", "action", "result"] as const).some((k) => f.star[k].status !== "present") && (
                    <p className="mt-2 text-xs text-muted">
                      {(["result", "action", "task", "situation"] as const).map((k) => f.star[k]).find((p) => p.status !== "present")?.note}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-accent/20 bg-accent-soft/40 p-4">
                <p className="label mb-3 text-accent">How to improve</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">Problem</dt>
                    <dd className="text-ink/90">{f.betterAnswer.problem}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">Improve</dt>
                    <dd className="text-ink/90">{f.betterAnswer.suggestion}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">Example</dt>
                    <dd>
                      <span className="text-ink/90 italic">{f.betterAnswer.example}</span>
                      <span className="mt-1 block text-[11px] text-faint">Illustrative example only — fill the [brackets] with your real facts. Not a claim about your experience.</span>
                    </dd>
                  </div>
                </dl>
                {f.notFound.length > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    <span className="text-faint">Not found in your answer:</span> {f.notFound.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
