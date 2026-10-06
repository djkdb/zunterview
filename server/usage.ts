/**
 * Usage limits and service counters, so a public deployment can't run up the AI or TTS bill
 * and the operator can see how the service is used. Nothing here identifies a person:
 * IP addresses are only kept as salted hashes for today's per-visitor quota, and events carry
 * no answer text.
 *
 *   AI_DAILY_BUDGET_USD=10        whole service, per day (KST). Over it, /api/health reports
 *                                 ai=false and clients run on the mock interviewer.
 *   AI_CALLS_PER_IP_PER_DAY=120   one visitor's AI calls per day (an interview is about 15–30)
 *   TTS_CHARS_PER_IP_PER_DAY=8000 one visitor's synthesized characters per day
 *   DATA_DIR=./var                where today's counters and the event log are kept
 */
import { createHash, randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EventName } from "../shared/schemas";

const num = (k: string, fallback: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
export const LIMITS = {
  budgetCents: () => num("AI_DAILY_BUDGET_USD", 10) * 100,
  aiCallsPerIp: () => num("AI_CALLS_PER_IP_PER_DAY", 120),
  ttsCharsPerIp: () => num("TTS_CHARS_PER_IP_PER_DAY", 8000),
};
const dataDir = () => process.env.DATA_DIR?.trim() || join(process.cwd(), "var");

/** Today in Korea, "2026-10-06". */
export const today = (now = Date.now()) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10);

export interface DayCounters {
  day: string;
  aiCalls: number;
  aiFailures: number;
  costCents: number;
  ttsChars: number;
  ttsCalls: number;
  limited: number;
  /** Product events by name (interview_started, interview_completed, …). */
  events: Record<string, number>;
  /** Helpful / not helpful votes on the result sheet. */
  feedback: { up: number; down: number };
  /** Distinct visitors that made an AI or TTS call. */
  visitors: number;
}

const blank = (day: string): DayCounters => ({ day, aiCalls: 0, aiFailures: 0, costCents: 0, ttsChars: 0, ttsCalls: 0, limited: 0, events: {}, feedback: { up: 0, down: 0 }, visitors: 0 });

let counters = blank(today());
/** Per-visitor usage today, keyed by a salted hash that changes every day. */
let perVisitor = new Map<string, { ai: number; tts: number }>();
let salt = randomBytes(16).toString("hex");
let loaded: Promise<void> | null = null;

const file = (day: string) => join(dataDir(), `usage-${day}.json`);

/** Reads today's counters back after a restart (the budget must survive a deploy). */
export function loadUsage(): Promise<void> {
  loaded ??= readFile(file(counters.day), "utf8")
    .then((raw) => {
      const saved = JSON.parse(raw) as DayCounters;
      if (saved.day === counters.day) counters = { ...blank(saved.day), ...saved };
    })
    .catch(() => undefined);
  return loaded;
}

function roll() {
  const day = today();
  if (day === counters.day) return;
  counters = blank(day);
  perVisitor = new Map();
  salt = randomBytes(16).toString("hex");
}

let saveTimer: NodeJS.Timeout | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await mkdir(dataDir(), { recursive: true });
      await writeFile(file(counters.day), JSON.stringify(counters));
    } catch {
      /* counters still work in memory */
    }
  }, 2000);
  saveTimer.unref?.();
}

/** Writes today's counters now (on shutdown). */
export async function flushUsage() {
  try {
    await mkdir(dataDir(), { recursive: true });
    await writeFile(file(counters.day), JSON.stringify(counters));
  } catch {
    /* nothing more to do */
  }
}

function visitor(ip: string) {
  roll();
  const key = createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
  let v = perVisitor.get(key);
  if (!v) {
    v = { ai: 0, tts: 0 };
    perVisitor.set(key, v);
    counters.visitors++;
  }
  return v;
}

export const budgetExhausted = () => {
  roll();
  return counters.costCents >= LIMITS.budgetCents();
};

/** Why an AI call can't be made now, or null. */
export function aiBlocked(ip: string): "budget" | "quota" | null {
  if (budgetExhausted()) return "budget";
  return visitor(ip).ai >= LIMITS.aiCallsPerIp() ? "quota" : null;
}

export function ttsBlocked(ip: string, chars: number): boolean {
  return visitor(ip).tts + chars > LIMITS.ttsCharsPerIp();
}

export function recordAi(ip: string, ok: boolean, cents: number | null) {
  visitor(ip).ai++;
  counters.aiCalls++;
  if (!ok) counters.aiFailures++;
  counters.costCents = Math.round((counters.costCents + (cents ?? 0)) * 100) / 100;
  save();
}

export function recordTts(ip: string, chars: number, cached: boolean) {
  visitor(ip).tts += chars;
  if (!cached) {
    counters.ttsChars += chars;
    counters.ttsCalls++;
  }
  save();
}

export function recordLimited() {
  roll();
  counters.limited++;
  save();
}

/* ───────────────────────────── product events ───────────────────────────── */


/** Counts the event and appends it (without IP or answer text) to the monthly log. */
export async function recordEvent(name: EventName, props: Record<string, string | number | boolean>) {
  roll();
  counters.events[name] = (counters.events[name] ?? 0) + 1;
  if (name === "feedback" && (props.rating === 1 || props.rating === -1)) counters.feedback[props.rating === 1 ? "up" : "down"]++;
  save();
  try {
    await mkdir(dataDir(), { recursive: true });
    await appendFile(join(dataDir(), `events-${counters.day.slice(0, 7)}.jsonl`), `${JSON.stringify({ at: new Date().toISOString(), name, ...props })}\n`);
  } catch {
    /* counting still worked */
  }
}

/** Today plus the saved days before it, newest first. */
export async function metrics(days = 14): Promise<DayCounters[]> {
  roll();
  const out: DayCounters[] = [{ ...counters }];
  for (let i = 1; i < days; i++) {
    const day = today(Date.now() - i * 86_400_000);
    try {
      out.push(JSON.parse(await readFile(file(day), "utf8")) as DayCounters);
    } catch {
      /* no data that day */
    }
  }
  return out;
}

/** For tests. */
export function resetUsage() {
  counters = blank(today());
  perVisitor = new Map();
  loaded = Promise.resolve();
}
