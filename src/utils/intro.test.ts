import { describe, expect, it } from "vitest";
import { introChecks, leadSentence, timeVerdict } from "./intro";

const good =
  "안녕하십니까. 지원자 김지현입니다. 환자 안전을 먼저 확인하는 간호사가 되겠다는 마음으로 준비했습니다. 내과 병동 실습 8주 동안 낙상 고위험 환자 체크리스트를 인수인계에 넣자고 제안했고, 실습 기간에 낙상 보고가 한 건도 없었습니다. 서울아산병원 내과 병동에서 이 습관으로 환자 곁을 지키는 간호사가 되겠습니다.";

describe("1분 자기소개", () => {
  it("judges the time against the 45 to 75 second band", () => {
    expect([30, 60, 90, null].map(timeVerdict)).toEqual(["short", "good", "long", null]);
  });

  it("skips the greeting and the name to find the first real sentence", () => {
    expect(leadSentence(good)).toBe("환자 안전을 먼저 확인하는 간호사가 되겠다는 마음으로 준비했습니다.");
  });

  it("checks the usual parts", () => {
    expect(introChecks(good, "간호사").every((c) => c.ok)).toBe(true);
    const thin = introChecks("안녕하세요. 성실함이 장점인 정우진입니다. 열심히 하겠습니다.", "사무행정");
    expect(thin.filter((c) => !c.ok).map((c) => c.key)).toEqual(["story", "number", "role"]);
  });
});
