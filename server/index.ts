/**
 * INTERVIEW//AI API layer.
 *
 *   GET  /api/health          → { ok, ai, model }
 *   POST /api/ai/question     → next main question
 *   POST /api/ai/follow-up    → follow-up decision
 *   POST /api/ai/analyze      → structured answer analysis
 *   POST /api/ai/report       → final report narrative
 *
 * In production it also serves the built frontend from /dist.
 * Candidate answers are never logged or stored here.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on the real environment */
}

const {
  AnalyzeRequestSchema,
  AnswerAnalysisSchema,
  FinalReportSchema,
  FollowUpDecisionSchema,
  FollowUpRequestSchema,
  GeneratedQuestionSchema,
  QuestionRequestSchema,
  ReportRequestSchema,
} = await import("../shared/schemas");
const { AIError, MODEL, callStructured, isAIConfigured } = await import("./claude");
const { questionPrompt } = await import("./prompts/questionPrompt");
const { followUpPrompt } = await import("./prompts/followupPrompt");
const { analysisPrompt } = await import("./prompts/analysisPrompt");
const { reportPrompt } = await import("./prompts/reportPrompt");
const { TtsRequestSchema } = await import("../shared/schemas");
const { TtsError, isFishConfigured, synthesize } = await import("./tts");
type PromptParts = import("./claude").PromptParts;

const PORT = Number(process.env.PORT ?? 8787);
const IS_PROD = process.env.NODE_ENV === "production";
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 40);
const MAX_BODY_BYTES = 64 * 1024;
const DIST_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");

/* ─────────────────────────── AI routes table ─────────────────────────── */

interface AIRoute<Req extends z.ZodType, Out extends z.ZodType> {
  request: Req;
  output: Out;
  prompt: (body: z.infer<Req>) => PromptParts;
}
const route = <Req extends z.ZodType, Out extends z.ZodType>(r: AIRoute<Req, Out>) => r;

const AI_ROUTES = {
  "/api/ai/question": route({
    request: QuestionRequestSchema,
    output: GeneratedQuestionSchema,
    prompt: (b) => questionPrompt(b.context),
  }),
  "/api/ai/follow-up": route({
    request: FollowUpRequestSchema,
    output: FollowUpDecisionSchema,
    prompt: (b) => followUpPrompt(b.context, b.turn, b.depth),
  }),
  "/api/ai/analyze": route({
    request: AnalyzeRequestSchema,
    output: AnswerAnalysisSchema,
    prompt: (b) => analysisPrompt(b.context, b.turn),
  }),
  "/api/ai/report": route({
    request: ReportRequestSchema,
    output: FinalReportSchema,
    prompt: (b) => reportPrompt(b),
  }),
} as const;

/* ─────────────────────────────── helpers ─────────────────────────────── */

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("too_large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const AI_ERROR_STATUS: Record<InstanceType<typeof AIError>["code"], number> = {
  refusal: 422,
  truncated: 502,
  parse: 502,
  upstream: 502,
  timeout: 504,
  rate_limited: 429,
  auth: 503,
};

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function serveStatic(pathname: string, res: ServerResponse) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST_DIR, safe);
  if (!file.startsWith(DIST_DIR)) return send(res, 403, { error: "forbidden" });
  try {
    if (!(await stat(file)).isFile()) throw new Error("dir");
  } catch {
    file = join(DIST_DIR, "index.html"); // SPA fallback
  }
  try {
    const data = await readFile(file);
    const immutable = file.includes(`${join(DIST_DIR, "assets")}`);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(data);
  } catch {
    send(res, 404, { error: "not_found", hint: "Run `npm run build` first." });
  }
}

/* ─────────────────────────────── server ──────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const started = Date.now();
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "microphone=(self), camera=()");

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, ai: isAIConfigured(), model: isAIConfigured() ? MODEL : null, tts: isFishConfigured() ? "fish" : null });
  }

  if (url.pathname === "/api/tts") {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (!isFishConfigured()) return send(res, 503, { error: "tts_not_configured" });
    const ip = req.socket.remoteAddress ?? "unknown";
    if (rateLimited(`tts:${ip}`)) return send(res, 429, { error: "rate_limited" });
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "invalid_body" });
    }
    const parsed = TtsRequestSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: "invalid_request" });
    try {
      const { audio, cached } = await synthesize(parsed.data.text, parsed.data.voice, parsed.data.speed);
      console.log(`[tts] ${parsed.data.voice} ${audio.length}B ${cached ? "cache" : `${Date.now() - started}ms`}`);
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": audio.length, "Cache-Control": "no-store" });
      return res.end(audio);
    } catch (err) {
      const status = err instanceof TtsError ? err.status : 502;
      console.warn(`[tts] failed (${status}) ${Date.now() - started}ms`);
      return send(res, status, { error: "tts_failed" });
    }
  }

  const aiRoute = AI_ROUTES[url.pathname as keyof typeof AI_ROUTES];
  if (aiRoute) {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (!isAIConfigured()) return send(res, 503, { error: "ai_not_configured" });
    const ip = req.socket.remoteAddress ?? "unknown";
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });

    let body: unknown;
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, e instanceof Error && e.message === "too_large" ? 413 : 400, { error: "invalid_body" });
    }
    const parsed = aiRoute.request.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: "invalid_request" });

    try {
      // Each route's prompt builder matches its own request schema.
      const prompt = (aiRoute.prompt as (b: unknown) => PromptParts)(parsed.data);
      const result = await callStructured(aiRoute.output, prompt);
      console.log(`[ai] ${url.pathname} 200 ${Date.now() - started}ms in=${result.usage.inputTokens} out=${result.usage.outputTokens}`);
      return send(res, 200, result);
    } catch (err) {
      const code = err instanceof AIError ? err.code : "upstream";
      console.warn(`[ai] ${url.pathname} failed (${code}) ${Date.now() - started}ms`);
      return send(res, AI_ERROR_STATUS[code], { error: code });
    }
  }

  if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "not_found" });
  if (IS_PROD) return serveStatic(url.pathname, res);
  return send(res, 404, { error: "not_found", hint: "In development, open the Vite dev server (http://localhost:5173)." });
});

server.listen(PORT, () => {
  console.log(
    `INTERVIEW//AI api → http://localhost:${PORT}  (${isAIConfigured() ? `AI MODE · ${MODEL}` : "no ANTHROPIC_API_KEY → clients run in MOCK MODE"}; TTS: ${isFishConfigured() ? "Fish Audio" : "browser speech"})`,
  );
});
