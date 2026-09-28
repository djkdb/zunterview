import type { InterviewContext } from "../../shared/schemas";
import { GROUNDING_RULES, describeContext, interviewerIdentity, languageRule } from "./common";

/** Generates the next *main* question (a new topic, not a follow-up). */
export function questionPrompt(ctx: InterviewContext) {
  const isFirst = ctx.progress.asked === 0;
  const system = `${interviewerIdentity(ctx.config)}

Your task: choose the next main interview question.

Question types and when to use them:
- opening: background / motivation. Use for the first question.
- deep_dive: pick up a concrete situation the candidate mentioned earlier and explore it.
- technical: a technical decision relevant to the position and job description.
- challenge: present a counter-scenario ("what if…", "what would you do differently if…").
- reflection: what they learned or would change.
- result: verify outcomes, impact or metrics.

Rules:
- Fit the position, experience level, interview type, difficulty and job description.
- Prefer building on something the candidate already said, so the interview feels like one conversation.
- Vary the type: do not use the same type as the previous question unless it is clearly best.
- Never repeat or closely paraphrase an already-asked question.
- Difficulty: easy = broad and welcoming; normal = specific; hard = probing, with constraints or trade-offs.

${GROUNDING_RULES}
${languageRule(ctx.config)}`;

  const user = `${describeContext(ctx)}

${isFirst ? "Ask the opening question. A short greeting clause is fine (e.g. 'Let's begin.')." : "Ask the next main question."}`;

  return { system, user };
}
