import { AnswerAnalysisSchema, FinalReportSchema, FollowUpDecisionSchema, GeneratedQuestionSchema, UsageSchema, } from "../../../shared/schemas";
import { sanitizeAnalysis, sanitizeFollowUp, sanitizeQuestion, sanitizeReport } from "../../../shared/sanitize";
import { AIRequestError } from "./AIProvider";
const TIMEOUT_MS = 45_000;
/**
 * Talks to our own API layer (server/), which holds the secret key and the
 * prompts. The browser only ever sends structured interview data.
 */
export class RealAIProvider {
    baseUrl;
    onUsage;
    kind = "ai";
    label;
    constructor(baseUrl, model, onUsage) {
        this.baseUrl = baseUrl;
        this.onUsage = onUsage;
        this.label = model ? `Claude · ${model}` : "Claude";
    }
    async post(path, body, schema, attempt = 0) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let res;
        try {
            res = await fetch(`${this.baseUrl}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        }
        catch (e) {
            clearTimeout(timer);
            const timedOut = e instanceof DOMException && e.name === "AbortError";
            if (!timedOut && attempt === 0)
                return this.post(path, body, schema, 1);
            throw new AIRequestError(timedOut ? "timeout" : "network", timedOut ? "The AI took too long to respond." : "Network error.");
        }
        clearTimeout(timer);
        if (!res.ok) {
            const retryable = res.status >= 500 && res.status !== 503;
            if (retryable && attempt === 0)
                return this.post(path, body, schema, 1);
            const code = await res
                .json()
                .then((j) => (typeof j.error === "string" ? j.error : ""))
                .catch(() => "");
            const kind = code === "parse" || code === "truncated"
                ? "parse"
                : res.status === 503
                    ? "unavailable"
                    : res.status === 429
                        ? "rate_limited"
                        : res.status === 422
                            ? "refusal"
                            : res.status === 504
                                ? "timeout"
                                : "server";
            throw new AIRequestError(kind, `AI request failed (${res.status}).`);
        }
        let json;
        try {
            json = await res.json();
        }
        catch {
            throw new AIRequestError("parse", "Malformed AI response.");
        }
        const envelope = json;
        const parsed = schema.safeParse(envelope.data);
        if (!parsed.success)
            throw new AIRequestError("parse", "AI response did not match the expected format.");
        const usage = UsageSchema.safeParse(envelope.usage);
        if (usage.success)
            this.onUsage?.(usage.data);
        return parsed.data;
    }
    async generateQuestion(ctx) {
        return sanitizeQuestion(await this.post("/api/ai/question", { context: ctx }, GeneratedQuestionSchema));
    }
    async generateFollowUp(ctx, turn, depth) {
        const out = await this.post("/api/ai/follow-up", { context: ctx, turn, depth }, FollowUpDecisionSchema);
        return sanitizeFollowUp(out, turn.answer);
    }
    async analyzeAnswer(ctx, turn) {
        const out = await this.post("/api/ai/analyze", { context: ctx, turn }, AnswerAnalysisSchema);
        return sanitizeAnalysis(out, turn.answer);
    }
    async generateFinalReport(req) {
        return sanitizeReport(await this.post("/api/ai/report", req, FinalReportSchema));
    }
}
