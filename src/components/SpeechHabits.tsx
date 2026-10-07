import type { ReactNode } from "react";
import { habitPattern, habitsClean, LONG_ANSWER, SHORT_ANSWER, type HabitHit, type SpeechHabits as Habits } from "../../shared/speechHabits";
import { josa } from "../../shared/korean";

const nos = (xs: number[]) => xs.map((n) => `${n}번`).join(", ");

/** The sample sentence with the habit marked. */
function Marked({ hit }: { hit: HabitHit }) {
  const s = hit.sample.sentence;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(habitPattern(hit.label))) {
    const at = m.index ?? 0;
    if (at > last) parts.push(s.slice(last, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-warn/20 px-0.5 text-ink">
        {m[0]}
      </mark>,
    );
    last = at + m[0].length;
  }
  parts.push(s.slice(last));
  return (
    <span className="text-muted">
      ‘{parts}’ <span className="text-faint">({hit.sample.questionNo}번)</span>
    </span>
  );
}

interface Row {
  key: string;
  what: string;
  count: string;
  where: string;
  sample?: HabitHit;
  tip: string;
}

function rows(h: Habits): Row[] {
  const out: Row[] = [];
  if (h.hedges && h.hedges.count >= 2)
    out.push({
      key: "hedge",
      what: "‘~것 같습니다’",
      count: `${h.hedges.count}번`,
      where: nos(h.hedges.questionNos),
      sample: h.hedges,
      tip: "해 본 일은 ‘~했습니다’, 내 판단은 ‘~라고 봤습니다’로 끝내 보세요. 면접관에게는 확신이 없는 말로 들릴 수 있습니다.",
    });
  if (h.casualEndings)
    out.push({
      key: "casual",
      what: "‘~요’로 끝난 문장",
      count: `${h.casualEndings.count}번`,
      where: nos(h.casualEndings.questionNos),
      sample: h.casualEndings,
      tip: "면접 답변은 ‘~습니다’로 맺는 편이 안정적으로 들립니다.",
    });
  for (const f of h.fillers)
    out.push({
      key: `filler-${f.label}`,
      what: `‘${f.label}’`,
      count: `${f.count}번`,
      where: nos(f.questionNos),
      sample: f,
      tip: `‘${f.label}’${josa(f.label, "을/를")} 빼고 다시 읽어 보세요. 뜻이 그대로라면 없어도 되는 말입니다.`,
    });
  if (h.short.length)
    out.push({
      key: "short",
      what: "너무 짧은 답",
      count: `${h.short.length}개`,
      where: nos(h.short),
      tip: `공백을 빼고 ${SHORT_ANSWER}자가 안 됐습니다. 결론 한 문장에 근거가 되는 경험 한두 문장을 붙여 보세요.`,
    });
  if (h.long.length)
    out.push({
      key: "long",
      what: "너무 긴 답",
      count: `${h.long.length}개`,
      where: nos(h.long),
      tip: `공백을 빼고 ${LONG_ANSWER}자를 넘었습니다. 결론을 첫 문장에 두고, 세부 내용은 면접관이 물으면 답해도 됩니다.`,
    });
  return out;
}

/** Result sheet: words and endings the candidate leaned on, counted over every answer. */
export function SpeechHabits({ habits }: { habits: Habits }) {
  if (habitsClean(habits))
    return (
      <p className="rounded-lg border border-good/25 bg-good/[0.05] px-3 py-2.5 text-[13px] text-ink/90">
        답변 {habits.answers}개에서 ‘~것 같습니다’, ‘약간’, ‘그냥’ 같은 말버릇이 거의 나오지 않았고, 답 길이도 적당했습니다.
      </p>
    );
  const list = rows(habits);
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        답변 {habits.answers}개에서 자주 쓴 표현과 답 길이를 셌습니다. 점수에는 반영하지 않았습니다.
      </p>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-left text-faint">
            <th className="border border-line px-2 py-1.5 font-semibold">표현</th>
            <th className="w-14 border border-line px-2 py-1.5 text-center font-semibold">횟수</th>
            <th className="border border-line px-2 py-1.5 font-semibold">고쳐 보기</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.key} className="align-top">
              <td className="border border-line px-2 py-2">
                <span className="font-semibold text-ink">{r.what}</span>
                <span className="mt-0.5 block text-[12px] text-faint">{r.where}</span>
              </td>
              <td className="border border-line px-2 py-2 text-center tabular-nums font-semibold text-warn">{r.count}</td>
              <td className="border border-line px-2 py-2 leading-relaxed">
                {r.sample && (
                  <span className="mb-1 block">
                    <Marked hit={r.sample} />
                  </span>
                )}
                <span className="text-ink/90">{r.tip}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
