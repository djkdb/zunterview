import type { Interview, InterviewQuestion } from "../types/interview";

export const PICK_BELOW = 60;
const MAX_ITEMS = 5;

/**
 * The questions worth answering again: low scores first, follow-ups before main questions
 * (a follow-up is where an interviewer finds the gap). Without low scores, the three lowest.
 */
export function pickForPractice(i: Interview): InterviewQuestion[] {
  const answered = i.questions.filter((q) => q.answer && q.score !== null && q.feedback);
  const low = answered.filter((q) => (q.score ?? 0) < PICK_BELOW);
  const pool = low.length ? low : answered;
  return [...pool].sort((a, b) => Number(b.isFollowUp) - Number(a.isFollowUp) || (a.score ?? 0) - (b.score ?? 0)).slice(0, low.length ? MAX_ITEMS : 3);
}

