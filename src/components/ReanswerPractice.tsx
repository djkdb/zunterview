import { useState } from "react";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_KO } from "../config/labelsKo";
import type { Interview, InterviewQuestion, Reanswer } from "../types/interview";
import { scoreTone } from "../utils/scoring";
import { TONE_TEXT } from "../utils/tones";
import { Button } from "./ui/Button";
import { PICK_BELOW, pickForPractice } from "../utils/practice";

function Delta({ from, to }: { from: number; to: number }) {
  const d = to - from;
  return <span className={`tabular-nums font-semibold ${d > 0 ? "text-good" : d < 0 ? "text-low" : "text-faint"}`}>{d > 0 ? `+${d}` : d}</span>;
}

function Item({ q, no, tries, onSubmit }: { q: InterviewQuestion; no: number; tries: Reanswer[]; onSubmit: (answer: string) => Promise<Reanswer | null> }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const last = tries[tries.length - 1];
  const before = q.score ?? 0;

  const submit = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    const r = await onSubmit(draft).catch(() => null);
    setBusy(false);
    if (r) setDraft("");
    else setFailed(true);
  };

  const changed = last
    ? CATEGORY_KEYS.map((k) => ({ k, from: q.feedback!.scores[k].score, to: last.feedback.scores[k].score }))
        .filter((c) => c.from !== c.to)
        .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))
        .slice(0, 3)
    : [];

  return (
    <li className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
        <span>{no}번</span>
        {q.isFollowUp && <span className="rounded bg-accent px-1.5 py-px font-semibold text-white">↳ 꼬리질문</span>}
        <span>
          처음 점수 <b className={`tabular-nums ${TONE_TEXT[scoreTone(before)]}`}>{before}</b>
        </span>
        {tries.length > 0 && <span>다시 답한 횟수 {tries.length}번</span>}
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed font-semibold text-ink">{q.text}</p>

      <div className={`mt-3 grid gap-3 ${last ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-lg bg-surface-2 px-3.5 py-3">
          <p className="text-[12px] font-semibold text-muted">처음 답변</p>
          <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{q.answer}</p>
          <p className="mt-2 text-[12px] text-warn">고칠 점: {q.feedback!.improve}</p>
        </div>
        {last && (
          <div className="rounded-lg border border-accent/25 bg-accent-soft px-3.5 py-3">
            <p className="flex items-baseline justify-between text-[12px] font-semibold text-accent">
              <span>다시 한 답변</span>
              <span>
                <b className={`text-[15px] tabular-nums ${TONE_TEXT[scoreTone(last.score)]}`}>{last.score}</b>점 (<Delta from={before} to={last.score} />)
              </span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{last.answer}</p>
            {changed.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                {changed.map((c) => (
                  <span key={c.k}>
                    {CATEGORY_KO[c.k]} {c.from}에서 {c.to} (<Delta from={c.from} to={c.to} />)
                  </span>
                ))}
              </p>
            )}
            <p className="mt-2 text-[12px] text-good">좋아진 점: {last.feedback.strength}</p>
            <p className="mt-0.5 text-[12px] text-warn">아직 고칠 점: {last.feedback.improve}</p>
          </div>
        )}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{no}번 질문에 다시 답하기</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          rows={3}
          placeholder={last ? "한 번 더 고쳐 답해 보세요." : "고칠 점을 반영해 다시 답해 보세요. 결론부터, 실제로 한 일과 결과를 넣으면 좋습니다."}
          className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
        />
      </label>
      <div className="mt-2 flex items-center justify-end gap-3">
        {failed && <span className="text-[12px] text-low">채점하지 못했습니다. 잠시 후 다시 눌러 주세요.</span>}
        <Button size="sm" variant="primary" disabled={!draft.trim() || busy} onClick={submit}>
          {busy ? "면접관이 보고 있습니다" : "다시 답하고 채점받기"}
        </Button>
      </div>
    </li>
  );
}

/** Result sheet: answer the weak questions again and compare with the first try. */
export function ReanswerPractice({ interview: i, onReanswer }: { interview: Interview; onReanswer: (questionId: string, answer: string) => Promise<Reanswer | null> }) {
  const items = pickForPractice(i);
  if (!items.length) return null;
  const low = items.some((q) => (q.score ?? 0) < PICK_BELOW);
  return (
    <section className="no-print mt-10" aria-labelledby="reanswer-title">
      <h2 id="reanswer-title" className="text-lg font-extrabold text-navy">
        막힌 질문 다시 답하기
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {low ? `점수가 ${PICK_BELOW}점 아래였던 질문입니다. 꼬리질문을 먼저 놓았습니다.` : "모두 60점을 넘었습니다. 점수가 가장 낮았던 질문 세 개로 더 다듬어 보세요."} 같은 면접관이 같은 기준으로 다시 채점하고, 처음 답과 나란히 보여 줍니다.
      </p>
      <ol className="mt-4 space-y-3" lang={i.config.language}>
        {items.map((q) => (
          <Item key={q.id} q={q} no={i.questions.indexOf(q) + 1} tries={(i.reanswers ?? []).filter((r) => r.questionId === q.id)} onSubmit={(a) => onReanswer(q.id, a)} />
        ))}
      </ol>
    </section>
  );
}
