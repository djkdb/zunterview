/**
 * 예상 꼬리질문: for each answer on the sheet, the follow-ups the mock interviewer's rules would
 * still ask. Computed in the browser from the answers already on screen; no AI call, no cost.
 */
import { LIMITS } from "../../shared/schemas";
import { MockAIProvider } from "../services/ai/MockAIProvider";
import type { Interview } from "../types/interview";
import { buildContext, toCurrentTurn } from "./context";

export interface Predicted {
  question: string;
  reason: string;
}

const rules = new MockAIProvider(false);

export function predictedFollowUps(i: Interview, max = 3): Record<string, Predicted[]> {
  const askedAll = i.questions.map((q) => q.text.slice(0, LIMITS.question));
  const out: Record<string, Predicted[]> = {};
  i.questions.forEach((q, idx) => {
    if (!q.answer || !q.feedback) return;
    const ctx = { ...buildContext({ ...i, questions: i.questions.slice(0, idx + 1) }), askedQuestions: askedAll.slice(-LIMITS.askedQuestions) };
    const list = rules.predictFollowUps(ctx, toCurrentTurn(q, q.answer)).slice(0, max);
    if (list.length) out[q.id] = list.map((f) => ({ question: f.question, reason: f.reason }));
  });
  return out;
}
