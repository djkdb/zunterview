import { describe, expect, it } from "vitest";
import { COMPANIES, COMPANY_DATA_COUNT, companyTracks, getCompany, guessTrack, questionsForTrack } from "./companies";
import { MockAIProvider } from "../src/services/ai/MockAIProvider";
import type { InterviewContext } from "./schemas";

describe("company dataset", () => {
  it("keeps every researched entry (none dropped by validation)", () => {
    expect(COMPANIES.length).toBe(COMPANY_DATA_COUNT);
  });

  it("has usable, sourced profiles", () => {
    for (const c of COMPANIES) {
      expect(c.questions.length).toBeGreaterThanOrEqual(5);
      expect(c.sources.length).toBeGreaterThanOrEqual(1);
      expect(new Set(COMPANIES.map((x) => x.id)).size).toBe(COMPANIES.length);
      expect(companyTracks(c)[0]).toBe("공통");
      expect(questionsForTrack(c, "공통").length).toBe(c.questions.length);
    }
  });

  it("guesses a sensible track from the position", () => {
    for (const c of COMPANIES) {
      const t = guessTrack(c, "백엔드 개발자");
      expect(companyTracks(c)).toContain(t);
    }
  });
});

describe("company interview mode (mock)", () => {
  it("asks questions from the company's bank after the self-introduction", async () => {
    const c = COMPANIES[0];
    if (!c) return;
    const ai = new MockAIProvider(false);
    const asked = ["먼저 1분 동안 간단하게 자기소개 부탁드립니다."];
    const types: InterviewContext["usedTypes"] = ["opening"];
    let fromBank = 0;
    for (let i = 1; i < 6; i++) {
      const q = await ai.generateQuestion({
        config: { position: "사무", experience: "entry", interviewType: "mixed", difficulty: "normal", questionLimit: 8, jobDescription: "", persona: "professional", language: "ko", companyId: c.id },
        progress: { asked: i, total: 8 },
        history: [],
        askedQuestions: [...asked],
        usedTypes: [...types],
      });
      expect(asked).not.toContain(q.question);
      if (getCompany(c.id)!.questions.some((x) => x.text === q.question)) fromBank++;
      asked.push(q.question);
      types.push(q.type);
    }
    expect(fromBank).toBeGreaterThanOrEqual(3);
  });
});
