import { speechHabits, type SpeechHabits } from "../../shared/speechHabits";
import type { Interview } from "../types/interview";

/** Speaking habits for a Korean interview, numbered like the sheet's 문항별 평가. English interviews get none. */
export function interviewHabits(i: Interview): SpeechHabits | null {
  if (i.config.language !== "ko") return null;
  const answers = i.questions.flatMap((q, idx) => (q.answer ? [{ no: idx + 1, text: q.answer }] : []));
  return answers.length ? speechHabits(answers) : null;
}
