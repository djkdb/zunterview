/**
 * Thin wrapper around the Claude Messages API with structured JSON output.
 * The API key is read from the server environment only.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { Usage } from "../shared/schemas";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

// Claude Opus 5.5 by default; AI_MODEL=claude-sonnet-5-5 runs about half the price and a bit faster.
export const MODEL = process.env.AI_MODEL?.trim() || "claude-opus-5-5";
// Interview turns are latency-sensitive, so default to low effort; raise via AI_EFFORT.
const EFFORT: Effort = EFFORTS.includes(process.env.AI_EFFORT as Effort)
  ? (process.env.AI_EFFORT as Effort)
  : "low";
// Server-side refusal fallback (re-runs a declined request on Anthropic's recommended model).
const USE_FALLBACKS = process.env.AI_FALLBACKS !== "off";

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 1, timeout: 60_000 });
  return client;
}

export class AIError extends Error {
  constructor(
    public readonly code: "refusal" | "truncated" | "parse" | "upstream" | "timeout" | "rate_limited" | "auth",
    message: string,
  ) {
    super(message);
  }
}

export interface PromptParts {
  system: string;
  user: string;
}

export async function callStructured<S extends z.ZodType>(
  schema: S,
  prompt: PromptParts,
): Promise<{ data: z.infer<S>; usage: Usage }> {
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { effort: EFFORT, format: betaZodOutputFormat(schema) },
      ...(USE_FALLBACKS ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new AIError("auth", "AI provider rejected the credentials");
    }
    if (err instanceof Anthropic.RateLimitError) throw new AIError("rate_limited", "AI provider rate limit");
    if (err instanceof Anthropic.APIConnectionTimeoutError) throw new AIError("timeout", "AI provider timed out");
    if (err instanceof Anthropic.APIError) throw new AIError("upstream", `AI provider error ${err.status ?? ""}`.trim());
    // SDK throws a plain error when the structured output fails validation.
    throw new AIError("parse", err instanceof Error ? err.message : "Unparseable AI response");
  }

  if (response.stop_reason === "refusal") throw new AIError("refusal", "The AI declined this request");
  if (response.stop_reason === "max_tokens") throw new AIError("truncated", "AI response was cut off");
  if (!response.parsed_output) throw new AIError("parse", "AI response did not match the schema");

  return {
    data: response.parsed_output as z.infer<S>,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    },
  };
}
