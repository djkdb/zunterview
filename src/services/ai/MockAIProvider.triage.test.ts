import { describe, expect, it } from "vitest";
import type { AIConfig, InterviewContext } from "../../../shared/schemas";
import { MockAIProvider } from "./MockAIProvider";

const provider = new MockAIProvider(false);
const ctx = (over: Partial<InterviewContext> = {}, config: Partial<AIConfig> = {}): InterviewContext => ({
  config: { position: "간호사", roleId: "nurse", experience: "entry", interviewType: "mixed", difficulty: "normal", questionLimit: 5, jobDescription: "", persona: "professional", language: "ko", ...config },
  progress: { asked: 2, total: 5, followUps: 0 },
  history: [],
  askedQuestions: [],
  usedTypes: ["opening"],
  ...over,
});
const avg = (a: Awaited<ReturnType<MockAIProvider["analyzeAnswer"]>>) => Object.values(a.scores).reduce((s, x) => s + x.score, 0) / 6;

describe("mock interviewer: replies that aren't answers", () => {
  it.each(["꺼지쇼", "ㅇㅇ", "asdf asdf", "싫어요"])("scores %s near zero, praises nothing, and moves on", async (answer) => {
    const turn = { question: "먼저 1분 동안 간단하게 자기소개 부탁드립니다.", type: "opening" as const, isFollowUp: false, answer };
    const a = await provider.analyzeAnswer(ctx(), turn);
    expect(avg(a)).toBeLessThan(20);
    expect(a.strength).toContain("평가할 수 있는 답변 내용이 없었습니다");
    expect((await provider.generateFollowUp(ctx(), turn, 0)).needed).toBe(false);
  });

  it("marks down an answer that ignores a specific question and asks it again", async () => {
    const turn = { question: "격리와 역격리는 대상과 목적이 어떻게 다른지 설명해 주세요.", type: "role_specific" as const, isFollowUp: false, answer: "저는 간호학과를 졸업하고 내과 병동에서 8주간 실습을 했습니다. 환자 안전을 가장 먼저 생각하는 간호사가 되고 싶습니다." };
    const a = await provider.analyzeAnswer(ctx(), turn);
    expect(a.quality).toBe("off_topic");
    expect(a.scores.relevance.score).toBeLessThanOrEqual(45);
    const f = await provider.generateFollowUp(ctx(), turn, 0);
    expect(f.needed).toBe(true);
    expect(f.question).toContain("제가 여쭌 건");
  });

  it("notices the same answer given twice", async () => {
    const answer = "결산 일정을 앞당기기 위해 마감 체크리스트를 만들고 부서별 자료 제출 기한을 D-3으로 바꿨습니다. 그 결과 월 결산이 7일에서 5일로 줄었습니다.";
    const history = [{ question: "결산 경험을 말씀해 주세요.", type: "experience" as const, isFollowUp: false, answer }];
    const turn = { question: "감사인과 의견이 달랐던 경험이 있나요?", type: "experience" as const, isFollowUp: false, answer };
    const a = await provider.analyzeAnswer(ctx({ history }, { position: "회계", roleId: "accountant" }), turn);
    expect(a.reaction).toContain("같은 내용");
    expect(a.improve).toContain("반복");
  });

  it("takes '몰라요' as not knowing, not as a short answer to dig into", async () => {
    const turn = { question: "본인에게 점수를 준다면 몇 점이며 그 이유는 무엇인가요?", type: "reflection" as const, isFollowUp: false, answer: "몰라요" };
    expect((await provider.generateFollowUp(ctx(), turn, 0)).needed).toBe(false);
    expect((await provider.analyzeAnswer(ctx(), turn)).improve).toContain("모르는 질문");
  });

  it("still follows up when the request's history already holds this answer (as the app sends it)", async () => {
    const turn = { question: "먼저 1분 동안 간단하게 자기소개 부탁드립니다.", type: "opening" as const, isFollowUp: false, answer: "안녕하세요. 대학병원 내과 병동에서 8주간 실습하면서 낙상 고위험 환자 체크리스트를 인수인계에 넣자고 제안했습니다." };
    const f = await provider.generateFollowUp(ctx({ history: [turn] }), turn, 0);
    expect(f.needed).toBe(true);
  });

  it("opens a non-engineering job with work, not a 'project'", async () => {
    const q = await provider.generateQuestion(ctx({ progress: { asked: 0, total: 5, followUps: 0 }, usedTypes: [] }, { position: "회계", roleId: "accountant", interviewType: "technical", experience: "mid" }));
    expect(q.question).not.toContain("프로젝트");
    expect(q.question).toContain("업무");
  });
});

describe("found in persona runs", () => {
  it("doesn't ask what happened next when the answer told no story", async () => {
    const turn = { question: "본인이 생각하는 리더십이란 무엇입니까?", type: "reflection" as const, isFollowUp: false, answer: "그 부분은 아직 경험이 부족하지만, 병동 매뉴얼을 먼저 확인하고 선배님께 배우면서 빠르게 익히겠습니다." };
    const f = await provider.generateFollowUp(ctx({ history: [turn] }), turn, 0);
    expect(f.question).not.toContain("그 후 환자");
  });
  it("calls a bare resolution what it is", async () => {
    const turn = { question: "동시에 여러 요청을 받았을 때 우선순위를 정해 처리한 경험을 말씀해 주세요.", type: "behavioral" as const, isFollowUp: false, answer: "최선을 다하겠습니다." };
    const a = await provider.analyzeAnswer(ctx(), turn);
    expect(a.reaction).toContain("각오는");
  });
});

describe("found in the CLI run", () => {
  it("doesn't take '회전 속도' for a performance issue, or ask how a hypothetical 'was' solved", async () => {
    const turn = { question: "CMP 이후 디싱이 생기면 어떤 공정 변수를 먼저 조정해 보시겠어요?", type: "technical" as const, isFollowUp: false, answer: "직접 다뤄 본 적은 없지만, 패드 압력과 회전 속도, 슬러리 유량 중 최근에 바뀐 조건이 있는지 이력부터 확인하고 한 번에 한 변수만 바꿔 비교하겠습니다." };
    const f = await provider.generateFollowUp(ctx({ history: [turn] }), turn, 0);
    expect(f.question).not.toContain("성능 문제");
    expect(f.question).not.toMatch(/찾으셨나요/);
  });
});
