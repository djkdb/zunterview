import { describe, expect, it } from "vitest";
import { questionCoverage, repeatsEarlier, triageAnswer } from "./answerTriage";

describe("triageAnswer", () => {
  it.each([
    ["질문이 이해가 안 되는데요", "clarify"],
    ["무슨 말씀이신지 잘 모르겠어요", "clarify"],
    ["다시 한 번 말씀해 주시겠어요?", "clarify"],
    ["네? 저는 지금 얘기한 게 아무 것도 없는데 뭐를 실제 사례를 들어야 되죠?", "clarify"],
    ["꺼지쇼", "hostile"],
    ["아 씨발 뭐래", "hostile"],
    ["ㅇㅇ", "nonsense"],
    ["ㅋㅋㅋㅋㅋ", "nonsense"],
    ["asdf asdf", "nonsense"],
    ["...", "nonsense"],
    ["싫어요", "refuse"],
    ["그냥요", "refuse"],
    ["노코멘트", "refuse"],
  ] as const)("%s → %s", (answer, kind) => {
    expect(triageAnswer(answer, "ko")).toBe(kind);
  });

  it.each(["네", "없습니다", "React", "저는 결산 업무를 6년 동안 맡았습니다.", "먼저 활력징후를 다시 측정하겠습니다.", "잘 모르겠습니다"])("%s is an answer", (answer) => {
    expect(triageAnswer(answer, "ko")).toBeNull();
  });

  it("reads English replies", () => {
    expect(triageAnswer("Sorry, what do you mean?", "en")).toBe("clarify");
    expect(triageAnswer("qwer zxcv", "en")).toBe("nonsense");
    expect(triageAnswer("No.", "en")).toBeNull();
  });
});

describe("questionCoverage", () => {
  it("is low when the answer ignores what was asked", () => {
    const q = "격리와 역격리는 대상과 목적이 어떻게 다른지 설명해 주세요.";
    expect(questionCoverage(q, "저는 간호학과를 졸업하고 내과 병동에서 8주간 실습을 했습니다.").coverage).toBe(0);
    expect(questionCoverage(q, "격리는 감염원이 되는 환자를, 역격리는 면역이 약한 환자를 보호하는 것이 목적입니다.").coverage).toBeGreaterThan(0.3);
  });

  it("does not judge a question with almost no content words", () => {
    expect(questionCoverage("왜요?", "그냥 궁금해서요.").coverage).toBe(1);
  });
});

describe("repeatsEarlier", () => {
  it("catches the same answer given twice", () => {
    const a = "결산 일정을 앞당기기 위해 마감 체크리스트를 만들고 부서별 자료 제출 기한을 D-3으로 바꿨습니다.";
    expect(repeatsEarlier(a, ["다른 답변입니다.", a])).toBe(true);
    expect(repeatsEarlier("감사인이 재고자산 평가를 지적했을 때 원가 계산 기준부터 다시 확인했습니다.", [a])).toBe(false);
  });
});

describe("questionCoverage ignores words any answer could share", () => {
  it("does not count a shared verb as addressing the question", () => {
    const q = "영업이익은 늘었는데 영업활동 현금흐름이 크게 줄었다면 어떤 원인부터 의심하시겠어요?";
    expect(questionCoverage(q, "결산 일정을 앞당겨 월 결산이 7일에서 5일로 줄었습니다.").coverage).toBe(0);
    expect(questionCoverage(q, "매출채권이 늘어 현금흐름이 줄었을 가능성부터 보겠습니다.").coverage).toBeGreaterThan(0);
  });
});
