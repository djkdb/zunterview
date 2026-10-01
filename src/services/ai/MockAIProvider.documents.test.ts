import { describe, expect, it } from "vitest";
import type { AIConfig, InterviewContext, QuestionType } from "../../../shared/schemas";
import { refersToDocuments, unaskable } from "../../../shared/questionRules";
import { MockAIProvider } from "./MockAIProvider";

const provider = new MockAIProvider(false);
const documents = {
  coverLetter:
    "졸업 프로젝트로 캠퍼스 중고거래 앱을 팀장으로 개발하여 3개월 동안 사용자 1,200명을 모았습니다. 서버 응답이 느려지는 문제가 있었는데, 쿼리를 개선해 응답 시간을 40% 줄였습니다. 팀원 간 의견 차이가 있었을 때 매주 회고를 도입해 해결했습니다. 귀사의 사용자 중심 문화에 공감하여 지원하게 되었습니다.",
  resume: "기술: React, TypeScript, Node.js\n프로젝트: 캠퍼스 중고거래 앱 (2024.03~2024.08) - 팀장\n자격증: 정보처리기사",
};

/** Runs the main questions of a whole interview (no follow-ups). */
async function run(config: Partial<AIConfig>, limit = 8): Promise<string[]> {
  const asked: string[] = [];
  const usedTypes: QuestionType[] = [];
  for (let i = 0; i < limit; i++) {
    const ctx: InterviewContext = {
      config: { position: "프론트엔드 개발자", roleId: "frontend", experience: "entry", interviewType: "mixed", difficulty: "normal", questionLimit: limit, jobDescription: "", persona: "professional", language: "ko", ...config },
      progress: { asked: i, total: limit, followUps: 0 },
      history: [],
      askedQuestions: [...asked],
      usedTypes: [...usedTypes],
    };
    const q = await provider.generateQuestion(ctx);
    asked.push(q.question);
    usedTypes.push(q.type);
  }
  return asked;
}

describe("mock interviewer: document-based interview", () => {
  it("opens by acknowledging the documents and verifies about half of the claims", async () => {
    const qs = await run({ documents });
    expect(qs[0]).toMatch(/^제출해 주신 서류는 잘 읽어 보았습니다\. .*자기소개/);
    const fromDocs = qs.slice(1).filter(refersToDocuments);
    expect(fromDocs.length).toBeGreaterThanOrEqual(3);
    expect(fromDocs.length).toBeLessThanOrEqual(4);
    expect(new Set(qs).size).toBe(qs.length);
    qs.forEach((q, i) => expect(unaskable(q, i, true)).toBe(false));
  });

  it("never mentions documents when none were submitted", async () => {
    const qs = await run({});
    expect(qs.filter(refersToDocuments)).toEqual([]);
    expect(qs[0]).not.toContain("서류");
  });
});

describe("mock interviewer: wishes are not team work", () => {
  it("doesn't ask 'which part did you handle' about a team the candidate only wants to join", async () => {
    const turn = { question: "지원 동기를 말씀해 주세요.", type: "motivation" as const, isFollowUp: false, answer: "앱을 운영하면서 사용자 문의 하나로 우선순위가 바뀌는 경험을 했습니다. 그래서 사용자 데이터를 보고 개발 방향을 정하는 팀에서 일하고 싶었습니다." };
    const ctx: InterviewContext = {
      config: { position: "백엔드 개발자", roleId: "backend", experience: "entry", interviewType: "mixed", difficulty: "normal", questionLimit: 5, jobDescription: "", persona: "professional", language: "ko" },
      progress: { asked: 2, total: 5, followUps: 0 },
      history: [{ ...turn }],
      askedQuestions: ["먼저 1분 동안 간단하게 자기소개 부탁드립니다.", turn.question],
      usedTypes: ["opening", "motivation"],
    };
    const f = await provider.generateFollowUp(ctx, turn, 0);
    expect(f.question).not.toContain("본인이 직접 해결한 부분");
  });
});
