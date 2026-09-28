/**
 * Builds the bounded conversation context sent to the AI.
 * Only the most recent turns go in full; older questions are sent as a
 * plain list so the model can avoid repeats without resending everything.
 */
import { LIMITS } from "../../shared/schemas";
const HISTORY_WINDOW = 4;
const ANSWER_CHARS_IN_HISTORY = 1500;
export function toAIConfig(i) {
    const { position, experience, interviewType, difficulty, questionLimit, jobDescription, persona, language, companyId, companyTrack } = i.config;
    return { position, experience, interviewType, difficulty, questionLimit, jobDescription, persona, language, companyId, companyTrack };
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function buildContext(i) {
    const answered = i.questions.filter((q) => q.answer);
    return {
        config: toAIConfig(i),
        progress: { asked: i.questions.length, total: i.config.questionLimit },
        history: answered.slice(-Math.min(HISTORY_WINDOW, LIMITS.historyTurns)).map((q) => ({
            question: clip(q.text, LIMITS.question),
            type: q.type,
            isFollowUp: q.isFollowUp,
            answer: clip(q.answer ?? "", ANSWER_CHARS_IN_HISTORY),
        })),
        askedQuestions: i.questions.slice(-LIMITS.askedQuestions).map((q) => clip(q.text, LIMITS.question)),
        usedTypes: i.questions.slice(-LIMITS.askedQuestions).map((q) => q.type),
    };
}
export function toCurrentTurn(q, answer) {
    return {
        question: clip(q.text, LIMITS.question),
        type: q.type,
        isFollowUp: q.isFollowUp,
        answer: clip(answer, LIMITS.answer),
    };
}
