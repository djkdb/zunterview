import type { CheckStatus, DocumentCheck } from "../../shared/documentCheck";

const STATUS: Record<CheckStatus, { label: string; tone: string }> = {
  mismatch: { label: "다름", tone: "border-low/40 bg-low/10 text-low" },
  unexplained: { label: "설명 부족", tone: "border-warn/40 bg-warn/10 text-warn" },
  match: { label: "일치", tone: "border-good/35 bg-good/10 text-good" },
};

/** Result sheet: what the answers said about the numbers and roles written in the documents. */
export function DocumentChecks({ checks }: { checks: DocumentCheck[] }) {
  const counts = (s: CheckStatus) => checks.filter((c) => c.status === s).length;
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        서류에 쓴 수치와 역할을 면접 답변과 맞춰 봤습니다. 다름 {counts("mismatch")}건, 설명 부족 {counts("unexplained")}건, 일치 {counts("match")}건. 실제 면접관도 서류와 답이 다르면 그 부분을 다시 묻습니다.
      </p>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-left text-faint">
            <th className="w-[4.5rem] border border-line px-2 py-1.5 font-semibold">결과</th>
            <th className="border border-line px-2 py-1.5 font-semibold">서류에 쓴 내용</th>
            <th className="hidden border border-line px-2 py-1.5 font-semibold sm:table-cell">면접에서</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr key={i} className="align-top">
              <td className="border border-line px-2 py-2">
                <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATUS[c.status].tone}`}>{STATUS[c.status].label}</span>
              </td>
              <td className="border border-line px-2 py-2">
                <span className="text-faint">{c.source === "resume" ? "이력서" : "자기소개서"}</span> ‘{c.claim}’
                <span className="mt-1 block text-muted sm:hidden">{c.detail}</span>
              </td>
              <td className="hidden border border-line px-2 py-2 text-muted sm:table-cell">
                {c.detail} <span className="text-faint">({c.questionNo}번 문항)</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
