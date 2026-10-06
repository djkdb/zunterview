import { describe, expect, it } from "vitest";
import type { AnswerAnalysis } from "../../shared/schemas";
import { CASES, type EvalCase } from "./cases";

const byId = <K extends EvalCase["kind"]>(id: string) => CASES.find((c) => c.id === id) as Extract<EvalCase, { kind: K }>;
const failed = (checks: [string, string | null][]) => checks.filter(([, p]) => p).map(([n]) => n);
const analysis = (score: number, over: Partial<AnswerAnalysis> = {}): AnswerAnalysis =>
  ({
    quality: "adequate",
    scores: Object.fromEntries(["relevance", "logic", "specificity", "structure", "communication", "confidence"].map((k) => [k, { score, reason: "r" }])),
    star: {},
    strength: "평가할 만한 내용이 없었습니다.",
    improve: "실제 경험을 한 가지 들어 주세요.",
    betterAnswer: { problem: "", suggestion: "", example: "" },
    evidence: [],
    notFound: [],
    reaction: "네, 알겠습니다.",
    roleSignal: null,
    ...over,
  }) as AnswerAnalysis;

describe("prompt evaluation checks", () => {
  it("pass a good interviewer and catch the failures they were written for", () => {
    const nurse = byId<"question">("q-nurse-role");
    expect(failed(nurse.checks({ question: "낙상 위험이 높은 환자를 인수인계할 때 무엇을 먼저 확인하시겠어요?", type: "situational", intent: "" }))).toEqual([]);
    expect(failed(nurse.checks({ question: "React 상태 관리는 어떻게 하시나요!", type: "technical", intent: "" }))).toEqual(["직무 이탈 없음", "사람 같은 말투"]);

    const plan = byId<"followup">("f-plan-not-experience");
    expect(failed(plan.checks({ needed: true, question: "그 장애의 원인은 어떻게 파악하셨나요?", type: "deep_dive", reason: "", anchor: "" }))).toEqual(["과거 경험처럼 묻지 않음"]);
    expect(failed(plan.checks({ needed: true, question: "원인을 찾는 데 시간이 오래 걸리면 어떻게 하시겠어요?", type: "challenge", reason: "", anchor: "" }))).toEqual([]);

    const strong = byId<"analyze">("a-strong");
    expect(failed(strong.checks(analysis(80, { evidence: ["마감 체크리스트를 만들고"] })))).toEqual([]);
    expect(failed(strong.checks(analysis(80, { evidence: ["팀원 10명을 설득했습니다"] })))).toEqual(["인용이 모두 답변에 있음"]);
  });
});
