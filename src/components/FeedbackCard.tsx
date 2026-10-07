import { AnimatePresence, motion } from "framer-motion";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_KO, QUESTION_TYPE_KO, grade } from "../config/labelsKo";
import type { PanelMember } from "../config/panel";
import type { InterviewQuestion } from "../types/interview";
import { scoreTone } from "../utils/scoring";
import { TONE_TEXT } from "../utils/tones";
import { ScoreBadge } from "./ScoreBadge";
import { ChevronIcon } from "./ui/icons";
import type { Predicted } from "../utils/predict";

const STAR_MARK = { present: "○", partial: "△", missing: "×" } as const;
const STAR_COLOR = { present: "text-good", partial: "text-warn", missing: "text-low" } as const;
const STAR_KO = { situation: "상황", task: "과제", action: "행동", result: "결과" } as const;

interface Props {
  q: InterviewQuestion;
  index: number;
  open: boolean;
  onToggle: () => void;
  asker: PanelMember;
  /** Follow-ups this answer could still get (rule-based), when there are any. */
  predicted?: Predicted[];
}

/** One row of 문항별 평가: question → my answer → feedback → how to improve. */
export function FeedbackCard({ q, index, open, onToggle, asker, predicted }: Props) {
  const f = q.feedback;
  if (!f || q.score === null) return null;
  const tone = scoreTone(q.score);
  const panelId = `review-${q.id}`;
  return (
    <li className={`rounded-lg border bg-surface transition-colors ${open ? "border-accent/40 shadow-sm" : "border-line hover:border-line-strong"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4">
        <span className="tabular-nums text-[13px] font-semibold text-faint">{index}번</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] text-faint">
            {q.isFollowUp && <span className="rounded bg-accent px-1.5 py-px font-semibold text-white">↳ 꼬리질문</span>}
            <span>{QUESTION_TYPE_KO[q.type]}</span>
            <span>{asker.name} {asker.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">{q.text}</span>
        </span>
        <span className="rounded border border-line px-1.5 text-[12px] font-bold text-muted">{grade(q.score)}</span>
        <span className={`w-9 text-right tabular-nums text-xl font-semibold ${TONE_TEXT[tone]}`}>{q.score}</span>
        <ChevronIcon className={`shrink-0 text-faint transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-line px-4 pt-4 pb-5">
              <div>
                <p className="label mb-1">질문</p>
                <p className="text-[15px] text-ink">{q.text}</p>
                {q.isFollowUp && q.followUpReason && <p className="mt-1 text-[13px] text-faint">질문 의도: {q.followUpReason}</p>}
              </div>
              <div>
                <p className="label mb-1">내 답변 {q.answerMode === "voice" && <span className="font-normal text-accent">(음성 답변)</span>}</p>
                <p className="rounded-lg bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-muted">{q.answer}</p>
                {f.evidence.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <span className="text-faint">평가 근거:</span>
                    {f.evidence.map((e) => (
                      <mark key={e} className="rounded bg-[#dde6f3] px-1.5 text-ink">
                        “{e}”
                      </mark>
                    ))}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-good/25 bg-good/[0.05] p-3.5">
                  <p className="label mb-1 text-good">잘한 점</p>
                  <p className="text-[14px] text-ink">{f.strength}</p>
                </div>
                <div className="rounded-lg border border-warn/25 bg-warn/[0.05] p-3.5">
                  <p className="label mb-1 text-warn">보완할 점</p>
                  <p className="text-[14px] text-ink">{f.improve}</p>
                </div>
              </div>

              {f.roleSignal && (
                <div className="rounded-lg border border-accent/20 bg-accent-soft/60 p-3.5">
                  <p className="label mb-1 text-accent">직무 관점: {f.roleSignal.label}</p>
                  <p className="text-[14px] text-ink">{f.roleSignal.note}</p>
                </div>
              )}

              <div>
                <p className="label mb-2">항목별 점수</p>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {CATEGORY_KEYS.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-[13px]">
                      <ScoreBadge score={f.scores[k].score} tone={scoreTone(f.scores[k].score)} small />
                      <span>
                        <span className="font-semibold text-ink">{CATEGORY_KO[k]}</span> <span className="text-muted">{f.scores[k].reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {f.star.applicable && (
                <div>
                  <p className="label mb-2">STAR 구조 점검</p>
                  <table className="w-full table-fixed border-collapse text-center text-[13px]">
                    <thead>
                      <tr>
                        {(["situation", "task", "action", "result"] as const).map((k) => (
                          <th key={k} className="border border-line bg-surface-2 py-1.5 font-semibold text-muted">
                            {k[0].toUpperCase()} · {STAR_KO[k]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(["situation", "task", "action", "result"] as const).map((k) => (
                          <td key={k} className="border border-line py-2" title={f.star[k].note}>
                            <span className={`text-lg font-bold ${STAR_COLOR[f.star[k].status]}`}>{STAR_MARK[f.star[k].status]}</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  {(["result", "action", "task", "situation"] as const).map((k) => f.star[k]).find((p) => p.status !== "present")?.note && (
                    <p className="mt-2 text-[13px] text-muted">{(["result", "action", "task", "situation"] as const).map((k) => f.star[k]).find((p) => p.status !== "present")?.note}</p>
                  )}
                </div>
              )}

              {predicted && predicted.length > 0 && (
                <div>
                  <p className="label mb-1">예상 꼬리질문</p>
                  <p className="mb-2 text-[12px] text-faint">이 답을 듣고 면접관이 더 물을 수 있는 질문입니다. 이번 면접에서 실제로 나온 질문은 뺐습니다.</p>
                  <ol className="space-y-1.5">
                    {predicted.map((p) => (
                      <li key={p.question} className="rounded-lg border border-line px-3 py-2 text-[14px]">
                        <span className="font-semibold text-ink">↳ {p.question}</span>
                        <span className="mt-0.5 block text-[12px] text-muted">{p.reason}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="rounded-lg border border-accent/25 bg-accent-soft p-4">
                <p className="label mb-3 text-accent">이렇게 답하면 더 좋아요</p>
                <dl className="space-y-2 text-[14px]">
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 font-semibold text-faint">문제점</dt>
                    <dd className="text-ink">{f.betterAnswer.problem}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 font-semibold text-faint">개선</dt>
                    <dd className="text-ink">{f.betterAnswer.suggestion}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 font-semibold text-faint">예시</dt>
                    <dd>
                      <span className="text-ink italic">{f.betterAnswer.example}</span>
                      <span className="mt-1 block text-[12px] text-faint">※ 예시 문장입니다. [괄호]에는 본인의 실제 경험과 수치를 넣어 주세요.</span>
                    </dd>
                  </div>
                </dl>
                {f.notFound.length > 0 && (
                  <p className="mt-3 text-[13px] text-muted">
                    <span className="text-faint">답변에서 확인되지 않은 정보:</span> {f.notFound.join(", ")}
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
