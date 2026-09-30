import { describe, expect, it } from "vitest";
import { initialState, reducer, type InterviewState } from "./interviewMachine";
import type { Interview, InterviewQuestion } from "../types/interview";
import type { AnswerAnalysis } from "../../shared/schemas";

const interview: Interview = {
  id: "i1",
  createdAt: 0,
  config: {
    position: "Frontend Developer",
    experience: "junior",
    interviewType: "mixed",
    difficulty: "normal",
    questionLimit: 3,
    jobDescription: "",
    persona: "professional",
    language: "ko",
    answerTimeLimit: 120,
    voiceEnabled: false,
    liveFeedback: true,
  },
  questions: [],
  overallScore: null,
  categoryScores: null,
  report: null,
  duration: 0,
  completed: false,
  endedEarly: false,
  providers: [],
};

const q = (id: string, parentId: string | null = null): InterviewQuestion => ({
  id,
  text: `question ${id}`,
  type: parentId ? "deep_dive" : "opening",
  isFollowUp: Boolean(parentId),
  parentId,
  askedAt: 0,
  answer: null,
  feedback: null,
  score: null,
  followUps: [],
  source: "mock",
});

const analysis = { scores: Object.fromEntries(["relevance", "logic", "specificity", "structure", "communication", "confidence"].map((k) => [k, { score: 80, reason: "" }])) } as unknown as AnswerAnalysis;

describe("interview state machine", () => {
  it("runs question → answer → analysis → follow-up → completion", () => {
    let s: InterviewState = reducer(initialState, { type: "OPEN_SETUP" });
    expect(s.phase).toBe("SETUP");
    s = reducer(s, { type: "START", interview });
    expect(s.phase).toBe("INTRO");
    s = reducer(s, { type: "QUESTION", question: q("a"), now: 1000 });
    expect(s.phase).toBe("ASKING");
    s = reducer(s, { type: "LISTEN", now: 3000 });
    expect(s.questionStartedAt).toBe(3000); // answer clock starts after the question is asked
    expect(s.phase).toBe("LISTENING");
    s = reducer(s, { type: "SUBMIT", questionId: "a", answer: "answer", mode: "text", durationSec: 5 });
    expect(s.phase).toBe("ANALYZING");
    s = reducer(s, { type: "ANALYZED", questionId: "a", analysis, score: 80, source: "mock" });
    s = reducer(s, { type: "TRANSITION", kind: "FOLLOW_UP", text: "좋습니다." });
    expect(s.phase).toBe("FOLLOW_UP");
    s = reducer(s, { type: "QUESTION", question: q("b", "a"), now: 5000 });
    expect(s.interview!.questions[0].followUps).toEqual(["b"]);
    s = reducer(s, { type: "COMPLETE", endedEarly: true, now: 61_000 });
    expect(s.phase).toBe("COMPLETED");
    expect(s.interview!.questions).toHaveLength(1); // unanswered follow-up dropped
    expect(s.interview!.overallScore).toBe(80);
    expect(s.interview!.duration).toBe(60);
  });

  it("returns to the interrupted phase after an error", () => {
    let s = reducer(reducer(initialState, { type: "START", interview }), { type: "QUESTION", question: q("a"), now: 0 });
    s = reducer(s, { type: "SUBMIT", questionId: "a", answer: "x", mode: "text", durationSec: 1 });
    s = reducer(s, { type: "FAIL", error: { message: "boom", kind: "network" } });
    expect(s.phase).toBe("ERROR");
    s = reducer(s, { type: "RECOVER" });
    expect(s.phase).toBe("ANALYZING");
  });

  it("restores an interrupted interview at the right step", () => {
    const answered = { ...q("a"), answer: "x", feedback: analysis, score: 80 };
    const pending = { ...q("b"), answer: "y" };
    let s = reducer(initialState, { type: "RESTORE", interview: { ...interview, questions: [answered, q("c")] }, elapsedSec: 90, now: 100_000 });
    expect(s.phase).toBe("LISTENING");
    expect(s.startedAt).toBe(10_000);
    s = reducer(initialState, { type: "RESTORE", interview: { ...interview, questions: [answered, pending] }, elapsedSec: 0, now: 0 });
    expect(s.phase).toBe("ANALYZING");
    s = reducer(initialState, { type: "RESTORE", interview: { ...interview, questions: [answered] }, elapsedSec: 0, now: 0 });
    expect(s.phase).toBe("NEXT_QUESTION");
  });
});

describe("ending an interview over conduct", () => {
  it("records why the panel stopped and shows the closing line, not 'next question'", () => {
    let s: InterviewState = reducer(initialState, { type: "START", interview });
    s = reducer(s, { type: "QUESTION", question: q("q1"), now: 0 });
    s = reducer(s, { type: "SUBMIT", questionId: "q1", answer: "꺼지쇼", mode: "text", durationSec: 1 });
    s = reducer(s, { type: "TRANSITION", kind: "CLOSING", text: "오늘 면접은 여기서 종료하겠습니다." });
    expect(s.closing).toBe(true);
    expect(s.phase).toBe("NEXT_QUESTION");
    s = reducer(s, { type: "COMPLETE", endedEarly: true, now: 1000, terminated: "conduct" });
    expect(s.interview?.terminated).toBe("conduct");
  });
});
