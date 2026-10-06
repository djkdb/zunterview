/**
 * INTERVIEW//AI API layer.
 *
 *   GET  /api/health          → { ok, ai, model }
 *   POST /api/ai/question     → next main question
 *   POST /api/ai/follow-up    → follow-up decision
 *   POST /api/ai/analyze      → structured answer analysis
 *   POST /api/ai/report       → final report narrative
 *   POST /api/ai/role-profile → practice profile for a job title outside the taxonomy
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
  InferredRoleSchema,
  RoleProfileRequestSchema,
  AnalyzeRequestSchema,
  AnswerAnalysisSchema,
  FinalReportSchema,
  FollowUpDecisionSchema,
  FollowUpRequestSchema,
  GeneratedQuestionSchema,
  QuestionRequestSchema,
  ReportRequestSchema,
} = await import("../shared/schemas");
const { AIError, MODEL, callStructured, costCents, isAIConfigured } = await import("./claude");
const { questionPrompt } = await import("./prompts/questionPrompt");
const { followUpPrompt } = await import("./prompts/followupPrompt");
const { analysisPrompt } = await import("./prompts/analysisPrompt");
const { reportPrompt } = await import("./prompts/reportPrompt");
const { rolePrompt } = await import("./prompts/rolePrompt");
const { PROMPT_VERSION } = await import("./prompts/version");
const { getDomain, guessDomain } = await import("../shared/roles");
const { setDataLoader } = await import("../shared/dataLoader");
const { TtsRequestSchema, EventSchema } = await import("../shared/schemas");
const usage = await import("./usage");
const { TtsError, isTtsConfigured, synthesize, ttsProviders } = await import("./tts");
type PromptParts = import("./claude").PromptParts;

const PORT = Number(process.env.PORT ?? 8787);
const IS_PROD = process.env.NODE_ENV === "production";
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 40);
const MAX_BODY_BYTES = 128 * 1024;
const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DIST_DIR = join(ROOT, "dist");

// Question banks are read from disk here (the browser fetches the same files from /data).
setDataLoader(async (path) => {
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, "");
  return JSON.parse(await readFile(join(ROOT, "public", "data", safe), "utf8"));
});

/* ─────────────────────────── AI routes table ─────────────────────────── */

interface AIRoute<Req extends z.ZodType, Out extends z.ZodType> {
  request: Req;
  output: Out;
  prompt: (body: z.infer<Req>) => PromptParts | Promise<PromptParts>;
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
  "/api/ai/role-profile": route({
    request: RoleProfileRequestSchema,
    output: InferredRoleSchema,
    prompt: (b) => rolePrompt(b.position, b.language),
  }),
} as const;

/* ─────────────────────────────── helpers ─────────────────────────────── */

function send(res: ServerResponse, status: number, body: unknown) {
  if (status === 204) {
    res.writeHead(204, { "Cache-Control": "no-store" });
    return res.end();
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

/** The page may only load its own code, the Pretendard font CDN, and audio it made itself. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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

/** The visitor's address; behind a hosting proxy (TRUST_PROXY=1) the first X-Forwarded-For entry. */
function clientIp(req: IncomingMessage): string {
  const forwarded = process.env.TRUST_PROXY === "1" ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "";
  return forwarded || req.socket.remoteAddress || "unknown";
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
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
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
      ...(extname(file) === ".html" ? { "Content-Security-Policy": CSP } : {}),
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
  res.setHeader("X-Frame-Options", "DENY");
  const ip = clientIp(req);

  if (url.pathname === "/api/health") {
    // Over the day's AI budget, clients start (or switch to) the mock interviewer.
    const ai = isAIConfigured() && !usage.budgetExhausted();
    return send(res, 200, { ok: true, ai, model: ai ? MODEL : null, tts: ttsProviders()[0] ?? null });
  }

  if (url.pathname === "/api/events") {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (rateLimited(`ev:${ip}`)) return send(res, 429, { error: "rate_limited" });
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "invalid_body" });
    }
    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: "invalid_request" });
    await usage.recordEvent(parsed.data.name, parsed.data.props ?? {});
    return send(res, 204, null);
  }

  if (url.pathname === "/api/admin/metrics") {
    // Operator only: ADMIN_TOKEN must be set and sent as a bearer token.
    const token = process.env.ADMIN_TOKEN?.trim();
    if (!token) return send(res, 404, { error: "not_found" });
    if (req.headers.authorization !== `Bearer ${token}`) return send(res, 401, { error: "unauthorized" });
    return send(res, 200, {
      limits: { budgetUsd: usage.LIMITS.budgetCents() / 100, aiCallsPerIp: usage.LIMITS.aiCallsPerIp(), ttsCharsPerIp: usage.LIMITS.ttsCharsPerIp() },
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      days: await usage.metrics(),
    });
  }

  if (url.pathname === "/api/tts") {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (!isTtsConfigured()) return send(res, 503, { error: "tts_not_configured" });
    if (rateLimited(`tts:${ip}`)) return send(res, 429, { error: "rate_limited" });
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "invalid_body" });
    }
    const parsed = TtsRequestSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: "invalid_request" });
    // A visitor's daily share of neural voice; past it the browser reads with its own voice.
    if (usage.ttsBlocked(ip, parsed.data.text.length)) {
      usage.recordLimited();
      return send(res, 429, { error: "quota" });
    }
    try {
      const { audio, cached, provider } = await synthesize(parsed.data.text, parsed.data.voice, parsed.data.speed);
      usage.recordTts(ip, parsed.data.text.length, cached);
      console.log(`[tts] ${provider} ${parsed.data.voice} ${audio.length}B ${cached ? "cache" : `${Date.now() - started}ms`}`);
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": audio.length, "Cache-Control": "no-store" });
      return res.end(audio);
    } catch (err) {
      const status = err instanceof TtsError ? err.status : 502;
      console.warn(`[tts] failed (${status}) ${Date.now() - started}ms — ${err instanceof Error ? err.message : "unknown error"}`);
      return send(res, status, { error: "tts_failed" });
    }
  }

  const aiRoute = AI_ROUTES[url.pathname as keyof typeof AI_ROUTES];
  if (aiRoute) {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (!isAIConfigured()) return send(res, 503, { error: "ai_not_configured" });
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    // The day's budget for the whole service, then this visitor's daily share.
    const blocked = usage.aiBlocked(ip);
    if (blocked) {
      usage.recordLimited();
      return send(res, 429, { error: blocked });
    }

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
      const prompt = await (aiRoute.prompt as (b: unknown) => PromptParts | Promise<PromptParts>)(parsed.data);
      const result = await callStructured(aiRoute.output, prompt);
      if (url.pathname === "/api/ai/role-profile") {
        // The domain must be one of ours; never trust the model's id blindly.
        const r = result.data as import("../shared/schemas").InferredRole;
        const body = parsed.data as { position: string };
        if (!getDomain(r.domain)) r.domain = guessDomain(body.position)?.id ?? "strategy";
      }
      const u = result.usage;
      const cents = costCents(u);
      console.log(`[ai] ${url.pathname} 200 prompt=${PROMPT_VERSION} ${Date.now() - started}ms in=${u.inputTokens} cache_read=${u.cacheReadTokens ?? 0} cache_write=${u.cacheWriteTokens ?? 0} out=${u.outputTokens}${cents === null ? "" : ` ≈${cents}¢`}`);
      usage.recordAi(ip, true, cents);
      return send(res, 200, result);
    } catch (err) {
      usage.recordAi(ip, false, 0);
      const code = err instanceof AIError ? err.code : "upstream";
      console.warn(`[ai] ${url.pathname} failed (${code}) ${Date.now() - started}ms`);
      return send(res, AI_ERROR_STATUS[code], { error: code });
    }
  }

  if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "not_found" });
  if (IS_PROD) return serveStatic(url.pathname, res);
  return send(res, 404, { error: "not_found", hint: "In development, open the Vite dev server (http://localhost:5173)." });
});

await usage.loadUsage();

// Hosting platforms stop the container with SIGTERM; finish in-flight requests first.
process.on("SIGTERM", () => {
  void usage.flushUsage();
  server.close(() => process.exit(0));
});

server.listen(PORT, () => {
  console.log(
    `INTERVIEW//AI api → http://localhost:${PORT}  (${isAIConfigured() ? `AI MODE · ${MODEL}` : "no ANTHROPIC_API_KEY → clients run in MOCK MODE"}; TTS: ${ttsProviders().join(" → ") || "browser speech"})`,
  );
});
