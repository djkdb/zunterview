import { josa } from "../../shared/korean";
import type { PresetQuestion } from "../types/interview";
import { scoreTone } from "../utils/scoring";
import { COMPETENCIES, COMPETENCY_KO, WEAK_BELOW, gapQuestion, type Competency, type StoryMap as Map } from "../utils/storyMap";
import { TONE_TEXT } from "../utils/tones";
import { Button } from "./ui/Button";

interface Props {
  map: Map;
  position: string;
  onPractice: (questions: PresetQuestion[]) => void;
}

const MAX_GAPS = 5;

/** 경험 지도: the candidate's stories against the kinds of questions a panel asks. */
export function StoryMap({ map, position, onPractice }: Props) {
  const gaps = [...map.missing, ...map.weak];
  const practiceGaps = () => onPractice(gaps.slice(0, MAX_GAPS).map((c) => gapQuestion(c, position)));
  const named = map.answers - map.unnamed.length;
  const top = map.overused;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="text-[15px] leading-relaxed text-ink">
          답변 <b className="tabular-nums">{map.answers}</b>개에서 경험 <b className="tabular-nums">{map.stories.length}</b>개를 썼습니다.
          {map.unnamed.length > 0 && <> 특정 경험 없이 답한 질문이 <b className="tabular-nums">{map.unnamed.length}</b>개입니다.</>}
        </p>
        {top && (
          <p className="mt-2 rounded-lg border border-warn/25 bg-warn/[0.06] px-3 py-2.5 text-[14px] leading-relaxed text-ink/90">
            {top.uses.length === named ? `경험을 말한 답변 ${named}개가 모두 ‘${top.name}’ 이야기였습니다.` : `경험을 말한 답변 ${named}개 중 ${top.uses.length}개가 ‘${top.name}’ 이야기였습니다.`} 실전에서 같은 이야기가 이어지면 면접관이 다른 경험을 물을 수 있습니다.
            {gaps.some((c) => c === "conflict" || c === "failure") ? " 협업·갈등이나 실패·극복에 쓸 두 번째 경험을 준비해 두세요." : " 다른 질문 유형에 쓸 두 번째 경험을 준비해 두세요."}
          </p>
        )}
        {gaps.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              아직 답해 본 적 없는 유형 {map.missing.length}개, {WEAK_BELOW}점을 넘지 못한 유형 {map.weak.length}개.
            </p>
            <Button size="sm" variant="primary" onClick={practiceGaps}>
              빈칸 질문 {Math.min(MAX_GAPS, gaps.length)}개로 면접
            </Button>
          </div>
        )}
      </section>

      <section aria-label="질문 유형별 준비 상태">
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {COMPETENCIES.map((c) => (
            <CoverageCard key={c} c={c} map={map} onPractice={() => onPractice([gapQuestion(c, position)])} />
          ))}
        </ul>
      </section>

      {map.stories.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-[15px] font-bold text-navy">경험별로 보기</h2>
          <p className="mt-1 text-[12px] text-faint">칸의 숫자는 그 유형의 질문에서 이 경험으로 받은 최고 점수입니다.</p>
          {/* Wide screens: the whole grid. */}
          <div className="mt-3 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-faint">
                  <th className="border-b border-line px-2 py-1.5 text-left font-semibold">경험</th>
                  {COMPETENCIES.map((c) => (
                    <th key={c} className="border-b border-line px-1.5 py-1.5 text-center font-semibold whitespace-nowrap">
                      {COMPETENCY_KO[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {map.stories.slice(0, 8).map((s) => (
                  <tr key={s.name}>
                    <td className="border-b border-line px-2 py-2">
                      <span className="font-semibold text-ink">{s.name}</span> <span className="text-faint">{s.uses.length}번</span>
                    </td>
                    {COMPETENCIES.map((c) => (
                      <td key={c} className="border-b border-line px-1.5 py-2 text-center tabular-nums">
                        {s.best[c] !== undefined ? <b className={TONE_TEXT[scoreTone(s.best[c]!)]}>{s.best[c]}</b> : <span className="text-line-strong">·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Phones: one line per story. */}
          <ul className="mt-3 space-y-2 sm:hidden">
            {map.stories.slice(0, 8).map((s) => (
              <li key={s.name} className="rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                <span className="font-semibold text-ink">{s.name}</span> <span className="text-faint">{s.uses.length}번</span>
                <span className="mt-0.5 block text-muted">
                  {(Object.entries(s.best) as [Competency, number][]).map(([c, v]) => `${COMPETENCY_KO[c]} ${v}`).join(" · ") || "상황·판단 질문에만 썼습니다"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CoverageCard({ c, map, onPractice }: { c: Competency; map: Map; onPractice: () => void }) {
  const cov = map.coverage[c];
  const missing = cov.answers === 0;
  const weak = !missing && (cov.best ?? 0) < WEAK_BELOW;
  return (
    <li className={`flex flex-col rounded-xl border bg-surface p-3.5 ${missing ? "border-dashed border-low/40" : weak ? "border-warn/35" : "border-line"}`}>
      <p className="text-[14px] font-bold text-ink">{COMPETENCY_KO[c]}</p>
      <p className={`mt-0.5 text-[13px] font-semibold ${missing ? "text-low" : weak ? "text-warn" : TONE_TEXT[scoreTone(cov.best ?? 0)]}`}>
        {missing ? "답해 본 적 없음" : `최고 ${cov.best}점 · ${cov.answers}번`}
      </p>
      <p className="mt-1 line-clamp-2 flex-1 text-[12px] text-muted">
        {cov.stories.length ? `${cov.stories.slice(0, 2).join(", ")}${josa(cov.stories[Math.min(1, cov.stories.length - 1)], "을/를")} 썼습니다.` : missing ? "이 유형의 질문을 아직 받지 않았습니다." : "특정 경험 없이 답했습니다."}
      </p>
      {(missing || weak) && (
        <button type="button" onClick={onPractice} className="mt-2 self-start text-[12px] font-semibold text-accent hover:text-navy hover:underline">
          이 유형으로 연습 →
        </button>
      )}
    </li>
  );
}
