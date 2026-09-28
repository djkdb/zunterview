import { HealthSchema } from "../../../shared/schemas";
import { AIRequestError } from "./AIProvider";
import { consumeInjectedFailure } from "./faults";
import { MockAIProvider } from "./MockAIProvider";
import { RealAIProvider } from "./RealAIProvider";
import { API_BASE_URL } from "../../config/env";
import { setNeuralTts } from "../speech/tts";
export { API_BASE_URL };
const CONFIGURED_MODE = (import.meta.env.VITE_AI_MODE ?? "auto");
/** Decide AI MODE vs MOCK MODE. Never throws — any failure means MOCK MODE. */
export async function detectProviderStatus() {
    const forced = new URLSearchParams(window.location.search).get("mode") === "mock";
    if (forced || CONFIGURED_MODE === "mock")
        return { mode: "mock", reason: "forced", model: null };
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
        clearTimeout(timer);
        const health = HealthSchema.safeParse(await res.json());
        if (!health.success)
            return { mode: "mock", reason: "unreachable", model: null };
        setNeuralTts(health.data.tts === "fish");
        return health.data.ai
            ? { mode: "ai", reason: "ok", model: health.data.model }
            : { mode: "mock", reason: "no-key", model: null };
    }
    catch {
        return { mode: "mock", reason: "unreachable", model: null };
    }
}
/** Wraps a provider so the debug panel can force the next call to fail. */
function withFaultInjection(p) {
    const guard = (fn) => async (...a) => {
        if (consumeInjectedFailure()) {
            await new Promise((r) => setTimeout(r, 400));
            throw new AIRequestError("injected", "Simulated AI failure (debug).");
        }
        return fn(...a);
    };
    return {
        kind: p.kind,
        label: p.label,
        generateQuestion: guard(p.generateQuestion.bind(p)),
        generateFollowUp: guard(p.generateFollowUp.bind(p)),
        analyzeAnswer: guard(p.analyzeAnswer.bind(p)),
        generateFinalReport: guard(p.generateFinalReport.bind(p)),
    };
}
export function createProvider(mode, model, onUsage) {
    const base = mode === "ai" ? new RealAIProvider(API_BASE_URL, model, onUsage) : new MockAIProvider();
    return withFaultInjection(base);
}
