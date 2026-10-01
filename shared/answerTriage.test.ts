import { describe, expect, it } from "vitest";
import { isMisconduct, misconductOf, questionCoverage, repeatsEarlier, triageAnswer } from "./answerTriage";

describe("triageAnswer", () => {
  it.each([
    ["질문이 이해가 안 되는데요", "clarify"],
    ["무슨 말씀이신지 잘 모르겠어요", "clarify"],
    ["다시 한 번 말씀해 주시겠어요?", "clarify"],
    ["네? 저는 지금 얘기한 게 아무 것도 없는데 뭐를 실제 사례를 들어야 되죠?", "clarify"],
    ["꺼지쇼", "hostile"],
    ["아 씨발 뭐래", "hostile"],
    ["ㅇㅇ", "informal"],
    ["ㅋㅋㅋㅋㅋ", "informal"],
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

describe("isMisconduct", () => {
  it.each(["꺼지쇼", "닥쳐", "어쩌라고", "아 씨발 뭐래", "저는 결산 업무를 맡았는데 솔직히 존나 힘들었습니다. 그래도 끝까지 마감했습니다."])("%s ends the interview", (a) => {
    expect(isMisconduct(a, "ko")).toBe(true);
  });
  it.each(["서버 전원이 꺼지는 장애가 있었을 때 로그부터 확인했습니다.", "그 경험이 제 진로의 시발점이 되었습니다.", "잘 모르겠습니다", "싫어요"])("%s does not", (a) => {
    expect(isMisconduct(a, "ko")).toBe(false);
  });
});

describe("misconductOf — what makes the chair end the interview", () => {
  it.each(["ㅅㅂ", "ㅂㅅ", "ㅄ", "시1발", "씨.발 몰라", "ㅗ", "어쩔티비", "개소리하네", "미친", "아 존나 어렵네요"])("%s is an insult", (a) => {
    expect(misconductOf(a, "ko")).toBe("insult");
  });
  it.each(["ㅇㅇ", "ㅋㅋㅋ", "싫어", "몰라", "응", "그냥", "왜?", "그냥 했어", "그거 제가 다 했음", "내가 왜 말해야 돼?", "팀 프로젝트였는데 제가 리더였거든. 그래서 다 내가 했어"])("%s is banmal / chat-speak", (a) => {
    expect(misconductOf(a, "ko")).toBe("informal");
  });
  it.each([
    "싫어요",
    "잘 모르겠습니다",
    "네",
    "3년입니다",
    "영어",
    "React",
    "팀장님이 '빨리 해'라고 하셔서 일정을 다시 짰습니다.",
    "처음에는 “왜 이렇게 해야 하지?”라고 생각했지만 결국 이해했습니다.",
    "그 결과 매출이 20% 늘었다. 저는 그 과정에서 데이터를 정리했다.",
    "제 강점은 끈기입니다. 포기하지 않는 편이거든요.",
    "그 경험이 제 진로의 시발점이 되었습니다.",
    "서버 전원이 꺼지는 장애가 있었을 때 로그부터 확인했습니다.",
    "미친 듯이 노력했다고 말할 수 있을 만큼 준비했습니다.",
  ])("%s is fine", (a) => {
    expect(misconductOf(a, "ko")).toBeNull();
  });
});

import { unaskable } from "./questionRules";
describe("unaskable", () => {
  it.each(["이력서에 적은 JWT 인증 방식을 설명해 주세요.", "이 부분을 지금 라이브 코딩으로 개선해 보시겠어요?", "화이트보드에 구조를 그려 주세요.", "Walk me through the project on your resume."])("%s", (q) => {
    expect(unaskable(q, 3)).toBe(true);
  });
  it("allows the self-introduction only first", () => {
    expect(unaskable("먼저 1분 동안 간단하게 자기소개 부탁드립니다.", 0)).toBe(false);
    expect(unaskable("1분 동안 자기소개와 함께 국민연금 제도를 소개해 주시겠습니까?", 2)).toBe(true);
    expect(unaskable("트랜잭션 격리 수준을 조정해야 했던 상황이 있나요?", 3)).toBe(false);
  });
});
