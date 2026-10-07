import type { JdCheck, JdStatus } from "../utils/jdCheck";
import { josa } from "../../shared/korean";

const STATUS: Record<JdStatus, { label: string; tone: string }> = {
  missing: { label: "답변에 없음", tone: "border-low/40 bg-low/10 text-low" },
  mentioned: { label: "언급만 함", tone: "border-warn/40 bg-warn/10 text-warn" },
  shown: { label: "경험으로 보여 줌", tone: "border-good/35 bg-good/10 text-good" },
};

/** Result sheet: each requirement of the pasted job posting against what the answers showed. */
export function JdChecks({ checks }: { checks: JdCheck[] }) {
  const n = (s: JdStatus) => checks.filter((c) => c.status === s).length;
  const missingRequired = checks.filter((c) => c.status !== "shown" && !c.preferred);
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        붙여넣은 공고의 요건을 답변과 맞춰 봤습니다. 경험으로 보여 줌 {n("shown")}개, 언급만 함 {n("mentioned")}개, 답변에 없음 {n("missing")}개.
        {missingRequired.length > 0 && (
          <>
            {" "}
            필수 요건 중 ‘{missingRequired[0].text}’{missingRequired.length > 1 ? ` 외 ${missingRequired.length - 1}개는` : josa(missingRequired[0].text, "은/는")} 실제 면접에서 물을 수 있으니 보여 줄 경험을 하나씩 준비해 두세요.
          </>
        )}
      </p>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-left text-faint">
            <th className="w-[6.5rem] border border-line px-2 py-1.5 font-semibold">결과</th>
            <th className="border border-line px-2 py-1.5 font-semibold">공고 요건</th>
            <th className="hidden border border-line px-2 py-1.5 font-semibold sm:table-cell">답변에서</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.text} className="align-top">
              <td className="border border-line px-2 py-2">
                <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATUS[c.status].tone}`}>{STATUS[c.status].label}</span>
              </td>
              <td className="border border-line px-2 py-2">
                <span className="font-semibold text-ink">{c.text}</span> <span className="text-[11px] text-faint">{c.preferred ? "우대" : "필수"}</span>
                {c.quote && <span className="mt-1 block text-muted sm:hidden">‘{c.quote}’ ({c.questionNo}번)</span>}
              </td>
              <td className="hidden border border-line px-2 py-2 text-muted sm:table-cell">
                {c.quote ? (
                  <>
                    ‘{c.quote}’ <span className="text-faint">({c.questionNo}번 문항)</span>
                  </>
                ) : (
                  <span className="text-faint">어느 답변에도 나오지 않았습니다.</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
