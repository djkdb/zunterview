import { describe, expect, it } from "vitest";
import { checkJobPosting, jdRequirements, keyTerms } from "./jdCheck";

const JD = "[자격요건] 재무회계 결산 실무 3년 이상, K-IFRS 이해, 연결재무제표 작성 경험\n[우대사항] SAP FI/CO 사용 경험, 외부감사 대응 경험";

describe("job posting check", () => {
  it("reads requirements and which ones are preferred", () => {
    const reqs = jdRequirements(JD);
    expect(reqs.length).toBeGreaterThanOrEqual(3);
    expect(reqs.find((r) => /연결재무제표/.test(r.text))?.preferred).toBe(false);
    expect(reqs.find((r) => /외부감사/.test(r.text))?.preferred).toBe(true);
  });

  it("splits a requirement into the words an answer must contain", () => {
    expect(keyTerms("GA4와 SQL")).toEqual(["GA4", "SQL"]);
    expect(keyTerms("B2B 영업")).toEqual(["B2B", "영업"]);
  });

  it("tells shown, mentioned and missing apart", () => {
    const checks = checkJobPosting(JD, [
      { no: 2, text: "연결 결산에서 내부거래 대사표를 표준화해 연결재무제표 작성 시간을 이틀에서 반나절로 줄였습니다." },
      { no: 4, text: "SAP는 아직 써 보지 못했지만 입사 전까지 공부하겠습니다." },
      { no: 5, text: "수익 인식이 애매한 거래는 K-IFRS 1115호의 5단계로 봅니다." },
    ]);
    const by = (re: RegExp) => checks.find((c) => re.test(c.text));
    expect(by(/연결재무제표/)).toMatchObject({ status: "shown", questionNo: 2 });
    expect(by(/SAP/)).toMatchObject({ status: "mentioned", questionNo: 4 });
    expect(by(/외부감사/)).toMatchObject({ status: "missing" });
    expect(by(/K-IFRS/)).toMatchObject({ status: "shown", questionNo: 5 });
  });
});
