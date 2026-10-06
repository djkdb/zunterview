import { describe, expect, it } from "vitest";
import type { Interview, InterviewQuestion } from "../types/interview";
import { DEFAULT_CONFIG } from "../config/options";
import { pickForPractice } from "./practice";

const q = (id: string, score: number, isFollowUp = false): InterviewQuestion => ({
  id, text: id, type: "experience", isFollowUp, parentId: isFollowUp ? "m" : null, askedAt: 0, answer: "답변", score, followUps: [], source: "mock",
  feedback: { improve: "x", strength: "y" } as unknown as InterviewQuestion["feedback"],
});
const interview = (qs: InterviewQuestion[]): Interview => ({ id: "i", createdAt: 0, config: DEFAULT_CONFIG, questions: qs, overallScore: 50, categoryScores: null, report: null, duration: 0, completed: true, endedEarly: false, providers: ["mock"] });

describe("pickForPractice", () => {
  it("puts low-scoring follow-ups first, then the lowest main questions", () => {
    expect(pickForPractice(interview([q("a", 40), q("b", 55, true), q("c", 80), q("d", 30)])).map((x) => x.id)).toEqual(["b", "d", "a"]);
  });
  it("offers the three lowest when nothing scored below 60", () => {
    expect(pickForPractice(interview([q("a", 90), q("b", 70), q("c", 65), q("d", 80)])).map((x) => x.id)).toEqual(["c", "b", "d"]);
  });
});
