import { describe, expect, it } from "vitest";
import { MockAIProvider } from "./MockAIProvider";
import type { InterviewContext } from "../../../shared/schemas";
import { AnswerAnalysisSchema, FinalReportSchema } from "../../../shared/schemas";

const ctx = (over: Partial<InterviewContext> = {}): InterviewContext => ({
  config: {
    position: "Frontend Developer",
    experience: "junior",
    interviewType: "project",
    difficulty: "normal",
    questionLimit: 5,
    jobDescription: "React, TypeScript 기반 웹 서비스 개발. 성능 최적화 경험 우대.",
    persona: "professional",
    language: "ko",
  },
  progress: { asked: 1, total: 5 },
  history: [],
  askedQuestions: ["가장 어려웠던 프로젝트 하나를 설명해주세요."],
  usedTypes: ["opening"],
  ...over,
});

const ai = new MockAIProvider(false);

describe("MockAIProvider follow-ups", () => {
  it("digs into the performance problem the candidate mentioned", async () => {
    const f = await ai.generateFollowUp(
      ctx(),
      { question: "가장 어려웠던 프로젝트 하나를 설명해주세요.", type: "opening", isFollowUp: false, answer: "팀 프로젝트에서 성능 문제를 해결했습니다." },
      0,
    );
    expect(f.needed).toBe(true);
    expect(f.question).toContain("성능 문제의 원인");
    expect(f.anchor).toBe("성능 문제");
  });

  it("asks to pick between two methods the candidate named", async () => {
    const f = await ai.generateFollowUp(
      ctx(),
      { question: "성능 문제의 원인은 어떻게 찾으셨나요?", type: "deep_dive", isFollowUp: true, answer: "로그와 profiling을 사용했습니다." },
      1,
    );
    expect(f.needed).toBe(true);
    expect(f.question).toMatch(/로그, profiling 중/);
  });

  it("asks about personal contribution when only the team is described", async () => {
    const f = await ai.generateFollowUp(
      ctx({ config: { ...ctx().config, language: "ko" } }),
      { question: "최근 프로젝트를 소개해주세요.", type: "opening", isFollowUp: false, answer: "저희 팀은 쇼핑몰 서비스를 만들었고 결제 기능을 개선해서 전환율이 12% 올랐습니다. 우리는 매주 회고를 했습니다." },
      0,
    );
    expect(f.needed).toBe(true);
    expect(f.question).toContain("본인이 직접");
  });

  it("stops following up at depth 2", async () => {
    const f = await ai.generateFollowUp(ctx(), { question: "q", type: "deep_dive", isFollowUp: true, answer: "로그와 profiling을 사용했습니다." }, 2);
    expect(f.needed).toBe(false);
  });
});

describe("MockAIProvider analysis", () => {
  it("scores a specific answer higher than a vague one, with grounded evidence", async () => {
    const turn = (answer: string) => ({ question: "성능 문제를 어떻게 해결했나요?", type: "deep_dive" as const, isFollowUp: false, answer });
    const strong = await ai.analyzeAnswer(
      ctx(),
      turn("당시 상품 목록 페이지의 로딩이 3초 이상 걸리는 상황이었습니다. 제가 성능 개선을 맡아 먼저 Chrome DevTools로 프로파일링을 했고, 불필요한 리렌더링이 원인이라는 걸 찾았습니다. 그래서 메모이제이션과 가상화를 적용했고, 그 결과 응답 시간이 1.8초에서 0.6초로 줄었습니다."),
    );
    const vague = await ai.analyzeAnswer(ctx(), turn("그냥 열심히 한 것 같아요."));
    const avg = (a: typeof strong) => Object.values(a.scores).reduce((s, x) => s + x.score, 0) / 6;
    expect(avg(strong)).toBeGreaterThan(avg(vague) + 15);
    expect(AnswerAnalysisSchema.safeParse(strong).success).toBe(true);
    expect(strong.star.result.status).toBe("present");
    for (const e of strong.evidence) expect(strong.evidence.length && e.length).toBeTruthy();
    expect(vague.quality === "insufficient" || vague.quality === "vague").toBe(true);
  });
});

describe("MockAIProvider calibration", () => {
  it("scores the sample excellent answer in the 80s and the poor one below 50", async () => {
    const { SAMPLE_ANSWERS } = await import("../../config/sampleAnswers");
    const { answerScore } = await import("../../utils/scoring");
    const turn = (answer: string) => ({ question: "가장 어려웠던 프로젝트 하나를 설명해주세요.", type: "opening" as const, isFollowUp: false, answer });
    const good = answerScore(await ai.analyzeAnswer(ctx(), turn(SAMPLE_ANSWERS.excellent.ko)));
    const poor = answerScore(await ai.analyzeAnswer(ctx(), turn(SAMPLE_ANSWERS.poor.ko)));
    expect(good).toBeGreaterThanOrEqual(80);
    expect(poor).toBeLessThan(50);
  });
});

describe("MockAIProvider questions & report", () => {
  it("does not repeat questions already asked", async () => {
    const asked: string[] = [];
    const types: InterviewContext["usedTypes"] = [];
    for (let i = 0; i < 12; i++) {
      const q = await ai.generateQuestion(ctx({ progress: { asked: i, total: 15 }, askedQuestions: [...asked], usedTypes: [...types] }));
      expect(asked).not.toContain(q.question);
      asked.push(q.question);
      types.push(q.type);
    }
  });

  it("produces a schema-valid report", async () => {
    const r = await ai.generateFinalReport({
      config: ctx().config,
      turns: [{ question: "q1", type: "opening", isFollowUp: false, answerExcerpt: "a", score: 72, strength: "s", improve: "i" }],
      computed: {
        overall: 72,
        categoryScores: { relevance: 80, logic: 70, specificity: 60, structure: 72, communication: 75, confidence: 74 },
        strongest: "relevance",
        weakest: "specificity",
      },
    });
    expect(FinalReportSchema.safeParse(r).success).toBe(true);
  });
});
