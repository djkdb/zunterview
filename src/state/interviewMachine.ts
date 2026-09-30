/**
 * The interview state machine. One `phase` drives every screen and every
 * interviewer animation — no scattered booleans.
 *
 *   IDLE → SETUP → INTRO → ASKING → LISTENING → ANALYZING
 *        → FOLLOW_UP | NEXT_QUESTION → ASKING …
 *        → COMPLETED → RESULT            (ERROR can interrupt INTRO/ANALYZING)
 */
import type { AnswerAnalysis, FinalReport, Interview, InterviewQuestion, ProviderKind } from "../types/interview";
import { categoryAverages, overallScore } from "../utils/scoring";

export type Phase =
  | "IDLE"
  | "SETUP"
  | "INTRO"
  | "ASKING"
  | "LISTENING"
  | "ANALYZING"
  | "FOLLOW_UP"
  | "NEXT_QUESTION"
  | "COMPLETED"
  | "RESULT"
  | "ERROR";

export type ProcessingStage = "submitted" | "thinking" | "analyzing";

export interface InterviewError {
  message: string;
  kind: string;
}

export interface InterviewState {
  phase: Phase;
  interview: Interview | null;
  stage: ProcessingStage | null;
  /** Interviewer's reaction line shown between questions. */
  transitionText: string | null;
  /** The reaction on screen is the chair ending the interview, not a lead-in to another question. */
  closing?: boolean;
  startedAt: number | null;
  questionStartedAt: number | null;
  error: InterviewError | null;
  resumePhase: Phase | null;
}

export type Action =
  | { type: "OPEN_SETUP" }
  | { type: "START"; interview: Interview }
  | { type: "QUESTION"; question: InterviewQuestion; now: number }
  | { type: "LISTEN"; now: number }
  | { type: "SUBMIT"; questionId: string; answer: string; mode: "text" | "voice"; durationSec: number }
  | { type: "STAGE"; stage: ProcessingStage }
  | { type: "ANALYZED"; questionId: string; analysis: AnswerAnalysis; score: number; source: ProviderKind }
  | { type: "TRANSITION"; kind: "FOLLOW_UP" | "NEXT_QUESTION" | "CLOSING"; text: string }
  | { type: "DROP_CURRENT" }
  | { type: "CLARIFY"; questionId: string; text: string; now: number }
  | { type: "COMPLETE"; endedEarly: boolean; now: number; terminated?: "conduct" | "informal" }
  | { type: "REPORT"; report: FinalReport; source: ProviderKind }
  | { type: "FAIL"; error: InterviewError }
  | { type: "RECOVER" }
  | { type: "VIEW_RESULT"; interview: Interview }
  | { type: "RESTORE"; interview: Interview; elapsedSec: number; now: number }
  | { type: "PATCH_CONFIG"; patch: Partial<Interview["config"]> }
  | { type: "RESET" };

export const initialState: InterviewState = {
  phase: "IDLE",
  interview: null,
  stage: null,
  transitionText: null,
  startedAt: null,
  questionStartedAt: null,
  error: null,
  resumePhase: null,
};

const withProvider = (i: Interview, kind: ProviderKind): Interview =>
  i.providers.includes(kind) ? i : { ...i, providers: [...i.providers, kind] };

const updateQuestion = (i: Interview, id: string, fn: (q: InterviewQuestion) => InterviewQuestion): Interview => ({
  ...i,
  questions: i.questions.map((q) => (q.id === id ? fn(q) : q)),
});

export function currentQuestion(s: InterviewState): InterviewQuestion | null {
  const qs = s.interview?.questions;
  return qs && qs.length ? qs[qs.length - 1] : null;
}

export function reducer(state: InterviewState, action: Action): InterviewState {
  switch (action.type) {
    case "OPEN_SETUP":
      return { ...initialState, phase: "SETUP" };

    case "START":
      return { ...initialState, phase: "INTRO", interview: action.interview };

    case "QUESTION": {
      if (!state.interview) return state;
      let interview = withProvider(state.interview, action.question.source);
      if (action.question.parentId) {
        interview = updateQuestion(interview, action.question.parentId, (p) => ({
          ...p,
          followUps: [...p.followUps, action.question.id],
        }));
      }
      interview = { ...interview, questions: [...interview.questions, action.question] };
      return {
        ...state,
        phase: "ASKING",
        interview,
        stage: null,
        startedAt: state.startedAt ?? action.now,
        questionStartedAt: action.now,
        error: null,
        resumePhase: null,
      };
    }

    case "LISTEN":
      // The answer clock starts once the interviewer has finished asking.
      return state.phase === "ASKING" ? { ...state, phase: "LISTENING", transitionText: null, questionStartedAt: action.now } : state;

    case "SUBMIT": {
      if (!state.interview) return state;
      const interview = updateQuestion(state.interview, action.questionId, (q) => ({
        ...q,
        answer: action.answer,
        answerMode: action.mode,
        answerDurationSec: action.durationSec,
      }));
      return { ...state, phase: "ANALYZING", stage: "submitted", interview, transitionText: null };
    }

    case "STAGE":
      return state.phase === "ANALYZING" ? { ...state, stage: action.stage } : state;

    case "ANALYZED": {
      if (!state.interview) return state;
      const interview = updateQuestion(withProvider(state.interview, action.source), action.questionId, (q) => ({
        ...q,
        feedback: action.analysis,
        score: action.score,
      }));
      return { ...state, interview };
    }

    case "TRANSITION":
      if (action.kind === "CLOSING") return { ...state, phase: "NEXT_QUESTION", closing: true, stage: null, transitionText: action.text };
      return { ...state, phase: action.kind, closing: false, stage: null, transitionText: action.text };

    case "CLARIFY": {
      // The candidate asked what the question meant: no answer is recorded, the interviewer explains and asks again.
      if (!state.interview) return state;
      const interview = updateQuestion(state.interview, action.questionId, (q) => ({ ...q, reaction: action.text, clarified: true }));
      return { ...state, interview, phase: "ASKING", transitionText: null, questionStartedAt: action.now };
    }

    case "DROP_CURRENT": {
      const q = currentQuestion(state);
      if (!state.interview || !q || q.answer) return state;
      let interview = { ...state.interview, questions: state.interview.questions.slice(0, -1) };
      if (q.parentId) {
        interview = updateQuestion(interview, q.parentId, (p) => ({ ...p, followUps: p.followUps.filter((id) => id !== q.id) }));
      }
      return { ...state, interview, phase: "NEXT_QUESTION", transitionText: null };
    }

    case "COMPLETE": {
      if (!state.interview) return state;
      const questions = state.interview.questions.filter((q) => q.answer && q.feedback);
      const interview: Interview = {
        ...state.interview,
        questions,
        endedEarly: action.endedEarly,
        ...(action.terminated ? { terminated: action.terminated } : {}),
        duration: state.startedAt ? Math.round((action.now - state.startedAt) / 1000) : 0,
        overallScore: overallScore(questions),
        categoryScores: categoryAverages(questions),
      };
      return { ...state, phase: "COMPLETED", interview, stage: null, transitionText: null };
    }

    case "REPORT":
      if (!state.interview) return state;
      return {
        ...state,
        phase: "RESULT",
        interview: { ...withProvider(state.interview, action.source), report: action.report, completed: true },
      };

    case "FAIL":
      return { ...state, phase: "ERROR", error: action.error, resumePhase: state.phase === "ERROR" ? state.resumePhase : state.phase };

    case "RECOVER":
      return state.phase === "ERROR" ? { ...state, phase: state.resumePhase ?? "IDLE", error: null } : state;

    case "VIEW_RESULT":
      return { ...initialState, phase: "RESULT", interview: action.interview };

    case "RESTORE": {
      const last = action.interview.questions[action.interview.questions.length - 1];
      const phase: Phase = !last ? "NEXT_QUESTION" : !last.answer ? "LISTENING" : !last.feedback ? "ANALYZING" : "NEXT_QUESTION";
      return {
        ...initialState,
        phase,
        stage: phase === "ANALYZING" ? "thinking" : null,
        interview: action.interview,
        startedAt: action.now - action.elapsedSec * 1000,
        questionStartedAt: action.now,
      };
    }

    case "PATCH_CONFIG":
      return state.interview ? { ...state, interview: { ...state.interview, config: { ...state.interview.config, ...action.patch } } } : state;

    case "RESET":
      return initialState;
  }
}
