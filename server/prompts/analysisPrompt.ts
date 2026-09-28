import type { CurrentTurn, InterviewContext } from "../../shared/schemas";
import { QUESTION_TYPE_LABEL } from "../../shared/labels";
import { GROUNDING_RULES, describeConfig, interviewerIdentity, languageRule } from "./common";

/** Scores a single answer with reasons grounded in the answer text. */
export function analysisPrompt(ctx: InterviewContext, turn: CurrentTurn) {
  const system = `${interviewerIdentity(ctx.config)}

Your task: evaluate one answer for practice feedback. This is a mock interview for practice, not a hiring decision.

Score each category 0-100 against the position and experience level:
- relevance: does it answer the question that was asked?
- logic: is the reasoning coherent and causal?
- specificity: concrete situations, actions, tools, numbers — as actually stated.
- structure: clear order (e.g. situation → action → result), easy to follow.
- communication: concise, clear wording.
- confidence: ownership and decisiveness in the wording (hedging lowers it).

Calibration — be honest, not generous:
- 85+ only with clear, specific evidence in the answer.
- 60-75 for reasonable but generic answers.
- Below 50 for very short, vague or off-topic answers.
- Every reason must point to something in the answer or something missing from it.

STAR: set applicable=true for behavioral, project or experience questions. For each part give present / partial / missing and a short note. For purely conceptual technical questions set applicable=false and use status "missing" with an empty note.

betterAnswer: describe the main problem, how to improve, and an illustrative example sentence. The example must not state new facts as if they were the candidate's — use [bracketed placeholders] for any number or detail the candidate did not give.

evidence: up to 3 short phrases copied verbatim from the answer. notFound: up to 3 things the answer did not mention.

reaction: one natural spoken sentence the interviewer says before continuing — e.g. a brief acknowledgement for a strong answer, or a gentle nudge when the answer was vague. Do not reveal scores in it and do not ask a question in it.

${GROUNDING_RULES}
${languageRule(ctx.config)}`;

  const user = `## Interview setup
${describeConfig(ctx.config)}

## Question [${QUESTION_TYPE_LABEL[turn.type]}${turn.isFollowUp ? ", follow-up" : ""}]
${turn.question}

<candidate_answer>
${turn.answer}
</candidate_answer>

Evaluate this answer.`;

  return { system, user };
}
