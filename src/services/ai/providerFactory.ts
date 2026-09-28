import { HealthSchema } from "../../../shared/schemas";
import { AIRequestError, type AIProvider, type UsageListener } from "./AIProvider";
import { consumeInjectedFailure } from "./faults";
import { MockAIProvider } from "./MockAIProvider";
import { RealAIProvider } from "./RealAIProvider";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const CONFIGURED_MODE = (import.meta.env.VITE_AI_MODE ?? "auto") as "auto" | "mock";

export interface ProviderStatus {
  mode: "ai" | "mock";
  reason: "ok" | "forced" | "no-key" | "unreachable";
  model: string | null;
}

/** Decide AI MODE vs MOCK MODE. Never throws — any failure means MOCK MODE. */
export async function detectProviderStatus(): Promise<ProviderStatus> {
  const forced = new URLSearchParams(window.location.search).get("mode") === "mock";
  if (forced || CONFIGURED_MODE === "mock") return { mode: "mock", reason: "forced", model: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    const health = HealthSchema.safeParse(await res.json());
    if (!health.success) return { mode: "mock", reason: "unreachable", model: null };
    return health.data.ai
      ? { mode: "ai", reason: "ok", model: health.data.model }
      : { mode: "mock", reason: "no-key", model: null };
  } catch {
    return { mode: "mock", reason: "unreachable", model: null };
  }
}

/** Wraps a provider so the debug panel can force the next call to fail. */
function withFaultInjection(p: AIProvider): AIProvider {
  const guard = <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
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

export function createProvider(mode: "ai" | "mock", model: string | null, onUsage?: UsageListener): AIProvider {
  const base = mode === "ai" ? new RealAIProvider(API_BASE_URL, model, onUsage) : new MockAIProvider();
  return withFaultInjection(base);
}
