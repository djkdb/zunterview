import { CATEGORY_KEYS } from "../../shared/schemas";
import { clampScore } from "../../shared/sanitize";
const WEIGHTS = {
    relevance: 0.2,
    logic: 0.15,
    specificity: 0.2,
    structure: 0.15,
    communication: 0.15,
    confidence: 0.15,
};
/** Single answer score = weighted mean of its category scores. */
export function answerScore(a) {
    return clampScore(CATEGORY_KEYS.reduce((sum, k) => sum + a.scores[k].score * WEIGHTS[k], 0));
}
export function answered(questions) {
    return questions.filter((q) => q.feedback && q.answer);
}
export function categoryAverages(questions) {
    const done = answered(questions);
    if (!done.length)
        return null;
    const out = {};
    for (const k of CATEGORY_KEYS) {
        out[k] = clampScore(done.reduce((s, q) => s + q.feedback.scores[k].score, 0) / done.length);
    }
    return out;
}
export function overallScore(questions) {
    const done = answered(questions);
    if (!done.length)
        return null;
    return clampScore(done.reduce((s, q) => s + (q.score ?? 0), 0) / done.length);
}
export function strongestAndWeakest(scores) {
    const sorted = [...CATEGORY_KEYS].sort((a, b) => scores[b] - scores[a]);
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}
export function scoreTone(score) {
    if (score >= 80)
        return "good";
    if (score >= 65)
        return "ok";
    if (score >= 50)
        return "warn";
    return "low";
}
