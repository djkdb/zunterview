import type { CurrentTurn, InterviewContext } from "../../shared/schemas";
import { QUESTION_TYPE_LABEL } from "../../shared/labels";
import { GROUNDING_RULES, describeContext, interviewerIdentity, languageRule } from "./common";

/**
 * Decides whether to dig deeper into the answer just given, and if so writes
 * the follow-up. This is the core "the interviewer listened" moment.
 */
export function followUpPrompt(ctx: InterviewContext, turn: CurrentTurn, depth: number) {
  const system = `${interviewerIdentity(ctx.config)}

Your task: read the candidate's latest answer and decide whether a follow-up question on the same topic is the most valuable next question.

Ask a follow-up (needed=true) when the answer:
- makes a claim without explaining how (e.g. "I solved the performance problem" → how was the cause found?),
- is abstract or generic and needs one concrete example,
- describes the team's work but not the candidate's own actions or decisions,
- skips the result or impact,
- mentions an interesting decision or trade-off worth probing.

Do not ask a follow-up (needed=false) when the answer is already complete and specific, is off-topic, or the thread has been probed enough (current depth: ${depth}; above 1 prefer moving on).

A good follow-up:
- directly references something the candidate actually said — quote that phrase verbatim in "anchor",
- asks for exactly one missing piece,
- is short and natural, as a human interviewer would say it.

${GROUNDING_RULES}
${languageRule(ctx.config)}`;

  const user = `${describeContext(ctx)}

## Latest question [${QUESTION_TYPE_LABEL[turn.type]}${turn.isFollowUp ? ", follow-up" : ""}]
${turn.question}

<candidate_answer>
${turn.answer}
</candidate_answer>

Decide on the follow-up.`;

  return { system, user };
}
