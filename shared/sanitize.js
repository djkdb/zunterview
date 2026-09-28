/**
 * Post-processing that makes AI output safe to render:
 *  - clamps scores into 0-100,
 *  - drops "evidence" quotes that do not literally appear in the answer
 *    (hallucination guard — analysis must be grounded in what was said),
 *  - trims list lengths and whitespace.
 */
import { CATEGORY_KEYS, } from "./schemas";
export const clampScore = (n) => Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
const normalize = (s) => s
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,!?…·:;()[\]{}-]+/g, " ")
    .trim();
/** True when `quote` appears (whitespace/punctuation-insensitively) in `source`. */
export function isGroundedQuote(quote, source) {
    const q = normalize(quote);
    if (q.length < 2)
        return false;
    return normalize(source).includes(q);
}
const tidy = (s, max = 400) => s.replace(/\s+/g, " ").trim().slice(0, max);
const tidyList = (xs, maxItems, maxLen = 240) => xs.map((x) => tidy(x, maxLen)).filter(Boolean).slice(0, maxItems);
export function sanitizeAnalysis(a, answer) {
    const scores = { ...a.scores };
    for (const key of CATEGORY_KEYS) {
        scores[key] = { score: clampScore(a.scores[key].score), reason: tidy(a.scores[key].reason, 240) };
    }
    return {
        ...a,
        scores,
        strength: tidy(a.strength),
        improve: tidy(a.improve),
        reaction: tidy(a.reaction, 220),
        betterAnswer: {
            problem: tidy(a.betterAnswer.problem, 240),
            suggestion: tidy(a.betterAnswer.suggestion, 300),
            example: tidy(a.betterAnswer.example, 400),
        },
        evidence: tidyList(a.evidence, 3, 160).filter((q) => isGroundedQuote(q, answer)),
        notFound: tidyList(a.notFound, 3),
    };
}
export function sanitizeQuestion(q) {
    return { ...q, question: tidy(q.question, 300), intent: tidy(q.intent, 200) };
}
export function sanitizeFollowUp(f, answer) {
    const anchor = tidy(f.anchor, 80);
    const question = tidy(f.question, 300);
    return {
        ...f,
        needed: f.needed && question.length > 0,
        question,
        reason: tidy(f.reason, 220),
        anchor: anchor && isGroundedQuote(anchor, answer) ? anchor : "",
    };
}
export function sanitizeReport(r) {
    return {
        headline: tidy(r.headline, 160),
        topFeedback: tidy(r.topFeedback, 320),
        strengths: tidyList(r.strengths, 4),
        improvements: tidyList(r.improvements, 4),
        nextSteps: tidyList(r.nextSteps, 4),
        closingRemark: tidy(r.closingRemark, 220),
    };
}
