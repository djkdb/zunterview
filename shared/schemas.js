/**
 * Shared contract between the browser and the API layer.
 *
 * - Request schemas are validated on the server before any prompt is built.
 * - Response schemas are used as Claude structured-output formats on the server
 *   AND re-validated in the browser, so a malformed AI response can never
 *   reach the UI unchecked.
 */
import { z } from "zod";
export const QUESTION_TYPES = [
    "opening",
    "motivation",
    "deep_dive",
    "technical",
    "challenge",
    "reflection",
    "result",
];
export const CATEGORY_KEYS = [
    "relevance",
    "logic",
    "specificity",
    "structure",
    "communication",
    "confidence",
];
export const STAR_STATUS = ["present", "partial", "missing"];
export const ANSWER_QUALITY = ["strong", "adequate", "vague", "insufficient", "off_topic"];
export const EXPERIENCE_LEVELS = ["entry", "junior", "mid", "senior"];
export const INTERVIEW_TYPES = ["hr", "technical", "project", "behavioral", "mixed"];
export const DIFFICULTIES = ["easy", "normal", "hard"];
export const PERSONAS = ["professional", "friendly", "strict", "technical"];
export const LANGUAGES = ["ko", "en"];
/* ───────────────────────────── Request side ───────────────────────────── */
export const LIMITS = {
    position: 80,
    jobDescription: 4000,
    question: 600,
    answer: 4000,
    historyTurns: 6,
    askedQuestions: 30,
};
export const AIConfigSchema = z.object({
    position: z.string().trim().min(1).max(LIMITS.position),
    experience: z.enum(EXPERIENCE_LEVELS),
    interviewType: z.enum(INTERVIEW_TYPES),
    difficulty: z.enum(DIFFICULTIES),
    questionLimit: z.number().int().min(1).max(20),
    jobDescription: z.string().max(LIMITS.jobDescription),
    persona: z.enum(PERSONAS),
    language: z.enum(LANGUAGES),
    /** Company interview mode: resolved server-side from our own dataset, never free text. */
    companyId: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
    companyTrack: z.string().max(20).optional(),
});
export const TurnSchema = z.object({
    question: z.string().max(LIMITS.question),
    type: z.enum(QUESTION_TYPES),
    isFollowUp: z.boolean(),
    answer: z.string().max(LIMITS.answer),
});
export const ContextSchema = z.object({
    config: AIConfigSchema,
    progress: z.object({
        asked: z.number().int().min(0).max(20),
        total: z.number().int().min(1).max(20),
    }),
    /** Most recent turns in full (bounded window). */
    history: z.array(TurnSchema).max(LIMITS.historyTurns),
    /** Every question asked so far — used to avoid repeats. */
    askedQuestions: z.array(z.string().max(LIMITS.question)).max(LIMITS.askedQuestions),
    usedTypes: z.array(z.enum(QUESTION_TYPES)).max(LIMITS.askedQuestions),
});
export const CurrentTurnSchema = z.object({
    question: z.string().min(1).max(LIMITS.question),
    type: z.enum(QUESTION_TYPES),
    isFollowUp: z.boolean(),
    answer: z.string().min(1).max(LIMITS.answer),
});
export const QuestionRequestSchema = z.object({ context: ContextSchema });
export const AnalyzeRequestSchema = z.object({ context: ContextSchema, turn: CurrentTurnSchema });
export const FollowUpRequestSchema = z.object({
    context: ContextSchema,
    turn: CurrentTurnSchema,
    /** How many follow-ups have already been asked on this thread. */
    depth: z.number().int().min(0).max(5),
});
export const ReportTurnSchema = z.object({
    question: z.string().max(LIMITS.question),
    type: z.enum(QUESTION_TYPES),
    isFollowUp: z.boolean(),
    answerExcerpt: z.string().max(800),
    score: z.number().min(0).max(100),
    strength: z.string().max(400),
    improve: z.string().max(400),
});
export const ReportRequestSchema = z.object({
    config: AIConfigSchema,
    turns: z.array(ReportTurnSchema).min(1).max(20),
    computed: z.object({
        overall: z.number().min(0).max(100),
        categoryScores: z.record(z.enum(CATEGORY_KEYS), z.number().min(0).max(100)),
        strongest: z.enum(CATEGORY_KEYS),
        weakest: z.enum(CATEGORY_KEYS),
    }),
});
/* ───────────────────────────── Response side ──────────────────────────── */
export const GeneratedQuestionSchema = z.object({
    question: z.string().describe("The question to ask, one or two short sentences."),
    type: z.enum(QUESTION_TYPES),
    intent: z.string().describe("One short sentence: what this question is meant to verify."),
});
export const FollowUpDecisionSchema = z.object({
    needed: z.boolean().describe("true if a follow-up on this same topic is the most useful next question."),
    question: z.string().describe("The follow-up question. Empty string when needed=false."),
    type: z.enum(QUESTION_TYPES),
    reason: z.string().describe("Why this follow-up, referring only to what the answer said or lacked."),
    anchor: z
        .string()
        .describe("A short verbatim phrase copied from the candidate's answer that the follow-up picks up. Empty if none."),
});
const CategoryScoreSchema = z.object({
    score: z.number().int().describe("0-100"),
    reason: z.string().describe("One short sentence grounded in the answer."),
});
const StarPartSchema = z.object({
    status: z.enum(STAR_STATUS),
    note: z.string(),
});
export const AnswerAnalysisSchema = z.object({
    quality: z.enum(ANSWER_QUALITY),
    scores: z.object({
        relevance: CategoryScoreSchema,
        logic: CategoryScoreSchema,
        specificity: CategoryScoreSchema,
        structure: CategoryScoreSchema,
        communication: CategoryScoreSchema,
        confidence: CategoryScoreSchema,
    }),
    star: z.object({
        applicable: z.boolean(),
        situation: StarPartSchema,
        task: StarPartSchema,
        action: StarPartSchema,
        result: StarPartSchema,
    }),
    strength: z.string(),
    improve: z.string(),
    betterAnswer: z.object({
        problem: z.string(),
        suggestion: z.string(),
        example: z
            .string()
            .describe("An illustrative example sentence. Use [bracketed placeholders] for any fact the candidate did not state."),
    }),
    evidence: z.array(z.string()).describe("Up to 3 short verbatim quotes from the answer that support the scores."),
    notFound: z.array(z.string()).describe("Up to 3 pieces of information the answer did not contain."),
    reaction: z.string().describe("The interviewer's brief spoken reaction before moving on. One sentence."),
});
export const FinalReportSchema = z.object({
    headline: z.string().describe("One-line summary of the interview."),
    topFeedback: z.string().describe("The single most useful piece of feedback."),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    nextSteps: z.array(z.string()),
    closingRemark: z.string().describe("The interviewer's closing line to the candidate."),
});
/** Usage metadata the server attaches to every AI response. */
export const UsageSchema = z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    model: z.string(),
});
export const HealthSchema = z.object({
    ok: z.boolean(),
    ai: z.boolean(),
    model: z.string().nullable(),
    /** Server-side neural TTS provider, when configured. */
    tts: z.enum(["fish"]).nullable().optional(),
});
/** Who is speaking: the three interviewers, or the staff member calling the candidate in. */
export const VOICES = ["left", "center", "right", "staff"];
export const TtsRequestSchema = z.object({
    text: z.string().trim().min(1).max(400),
    voice: z.enum(VOICES),
    speed: z.number().min(0.5).max(2).optional(),
});
