import { describe, expect, it } from "vitest";
import type { Interview, InterviewQuestion, Reanswer } from "../types/interview";
import { DEFAULT_CONFIG } from "../config/options";
import { buildNotebook, noteKey, notebookText, practiceQuestions, sortForReview, sourceInterviewId } from "./notebook";

const feedback = (improve: string) =>
  ({ improve, strength: "s", betterAnswer: { problem: "p", suggestion: "g", example: `예시: ${improve}` } }) as unknown as InterviewQuestion["feedback"];
const q = (id: string, text: string, score: number, extra: Partial<InterviewQuestion> = {}): InterviewQuestion => ({
  id, text, type: "experience", isFollowUp: false, parentId: null, askedAt: 0, answer: `${id} 답변`, score, followUps: [], source: "mock", feedback: feedback(`${id} 고칠 점`), ...extra,
});
const interview = (id: string, createdAt: number, qs: InterviewQuestion[], reanswers: Reanswer[] = []): Interview => ({
  id, createdAt, config: { ...DEFAULT_CONFIG, position: "회계" }, questions: qs, overallScore: 50, categoryScores: null, report: null, duration: 0, completed: true, endedEarly: false, providers: ["mock"], reanswers,
});

describe("buildNotebook", () => {
  it("merges the same question across interviews, newest attempt first", () => {
    const notes = buildNotebook(
      [
        interview("new", 200, [q("a2", "자기소개 부탁드립니다", 72, { type: "opening", askedAt: 200 })]),
        interview("old", 100, [q("a1", "자기소개 부탁드립니다.", 48, { type: "opening", askedAt: 100 })]),
      ],
      {},
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].group).toBe("intro");
    expect(notes[0].attempts.map((a) => a.score)).toEqual([72, 48]);
    expect(notes[0].best).toBe(72);
  });

  it("counts a re-answer from the result sheet as a newer attempt", () => {
    const re: Reanswer = { questionId: "a", answer: "다시 한 답", score: 81, feedback: feedback("다시") as NonNullable<InterviewQuestion["feedback"]>, source: "mock", at: 500 };
    const [note] = buildNotebook([interview("i", 100, [q("a", "실패 경험을 말해 주세요", 40, { askedAt: 100 })], [re])], {});
    expect(note.attempts[0]).toMatchObject({ answer: "다시 한 답", score: 81 });
    expect(note.best).toBe(81);
  });

  it("keeps the follow-up's main question for context and skips unanswered questions", () => {
    const notes = buildNotebook(
      [interview("i", 100, [q("m", "프로젝트 경험", 70), q("f", "그 수치는 어떻게 측정했나요?", 50, { isFollowUp: true, parentId: "m" }), q("u", "답 안 한 질문", 0, { answer: null, score: null })])],
      {},
    );
    expect(notes.map((n) => n.question)).toEqual(["프로젝트 경험", "그 수치는 어떻게 측정했나요?"]);
    expect(notes[1].attempts[0].parent).toBe("프로젝트 경험");
  });

  it("keeps the same follow-up apart when it came from different main questions", () => {
    const generic = "조금 더 구체적으로 말씀해 주시겠어요?";
    const notes = buildNotebook(
      [interview("i", 100, [q("m1", "강점", 70), q("f1", generic, 40, { isFollowUp: true, parentId: "m1" }), q("m2", "실패 경험", 70), q("f2", generic, 50, { isFollowUp: true, parentId: "m2" })])],
      {},
    );
    expect(notes.filter((n) => n.question === generic)).toHaveLength(2);
  });

  it("keeps a written answer after its interview is gone", () => {
    const notes = buildNotebook([], { [noteKey("지원 동기는?")]: { question: "지원 동기는?", text: "정리한 답", at: 1 } });
    expect(notes).toEqual([expect.objectContaining({ question: "지원 동기는?", attempts: [], best: null, script: expect.objectContaining({ text: "정리한 답" }) })]);
  });

  it("puts the weakest questions first and exports plain text", () => {
    const notes = sortForReview(buildNotebook([interview("i", 1, [q("a", "강점", 85), q("b", "약점", 45)])], {}));
    expect(notes.map((n) => n.question)).toEqual(["약점", "강점"]);
    const text = notebookText(notes);
    expect(text).toContain("1. 약점");
    expect(text).toContain("최근 답변(45점): b 답변");
  });

  it("turns notes into interview questions: follow-ups through their main question, self-introduction first", () => {
    const notes = sortForReview(
      buildNotebook(
        [
          interview("i", 100, [
            q("m", "프로젝트 경험", 70),
            q("f", "그 수치는 어떻게 측정했나요?", 30, { isFollowUp: true, parentId: "m" }),
            q("o", "자기소개 부탁드립니다", 55, { type: "opening" }),
            q("x", "실패 경험", 40),
          ]),
        ],
        {},
      ),
    );
    expect(practiceQuestions(notes).map((p) => p.text)).toEqual(["자기소개 부탁드립니다", "프로젝트 경험", "실패 경험"]);
    expect(sourceInterviewId(notes)).toBe("i");
  });
});
