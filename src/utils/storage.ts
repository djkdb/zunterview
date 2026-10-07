/**
 * localStorage persistence. Every access is guarded: if storage is blocked
 * or full, the app keeps working without history.
 * Data never leaves this browser.
 */
import type { Interview, InterviewConfig, InterviewSummary } from "../types/interview";
import type { IntroAttempt } from "./intro";
import { strongestAndWeakest } from "./scoring";
import { getCompany } from "../../shared/companies";
import { hasDocuments } from "../../shared/documents";
import type { Documents } from "../../shared/schemas";

const KEYS = {
  summaries: "interview-ai:history:v1",
  interview: (id: string) => `interview-ai:interview:v1:${id}`,
  lastConfig: "interview-ai:last-config:v1",
  active: "interview-ai:active:v1",
  prefs: "interview-ai:prefs:v1",
  documents: "interview-ai:documents:v1",
  scripts: "interview-ai:scripts:v1",
  intro: "interview-ai:intro:v1",
} as const;
const MAX_FULL_RECORDS = 10;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadHistory(): InterviewSummary[] {
  const list = read<InterviewSummary[]>(KEYS.summaries, []);
  return Array.isArray(list) ? list.filter((x) => x && typeof x.id === "string") : [];
}

export function toSummary(i: Interview): InterviewSummary {
  return {
    id: i.id,
    createdAt: i.createdAt,
    position: i.config.position,
    interviewType: i.config.interviewType,
    score: i.overallScore ?? 0,
    duration: i.duration,
    questionCount: i.questions.filter((q) => q.answer).length,
    strongest: i.categoryScores ? strongestAndWeakest(i.categoryScores).strongest : null,
    company: getCompany(i.config.companyId)?.name,
    ...(i.usedDocuments?.length ? { usedDocuments: i.usedDocuments } : {}),
  };
}

/**
 * History keeps which documents an interview used, never their text: the résumé and cover
 * letter stay only in the in-progress interview (and in the browser if the candidate asked).
 */
export function withoutDocuments(i: Interview): Interview {
  const d = i.config.documents;
  if (!d) return i;
  const config = { ...i.config };
  delete config.documents;
  const used = hasDocuments(d) ? (["resume", "coverLetter"] as const).filter((k) => d[k].trim()) : [];
  return { ...i, config, ...(used.length ? { usedDocuments: [...used] } : {}) };
}

/** Saves the summary and the full record (last N kept). Returns false if storage failed. */
export function saveInterview(full: Interview): boolean {
  const i = withoutDocuments(full);
  const list = loadHistory().filter((x) => x.id !== i.id);
  list.unshift(toSummary(i));
  const ok = write(KEYS.summaries, list.slice(0, 50));
  write(KEYS.interview(i.id), i);
  for (const old of list.slice(MAX_FULL_RECORDS)) remove(KEYS.interview(old.id));
  return ok;
}

export function loadInterview(id: string): Interview | null {
  const i = read<Interview | null>(KEYS.interview(id), null);
  return i && Array.isArray(i.questions) && i.config ? i : null;
}

export function deleteInterview(id: string) {
  write(KEYS.summaries, loadHistory().filter((x) => x.id !== id));
  remove(KEYS.interview(id));
}

export function clearAllLocalData() {
  for (const s of loadHistory()) remove(KEYS.interview(s.id));
  remove(KEYS.summaries);
  remove(KEYS.lastConfig);
  remove(KEYS.active);
  remove(KEYS.prefs);
  remove(KEYS.documents);
  remove(KEYS.scripts);
  remove(KEYS.intro);
}

/** Every interview whose full sheet is still kept (the most recent ten), newest first. */
export function loadFullInterviews(): Interview[] {
  return loadHistory().flatMap((s) => {
    const i = loadInterview(s.id);
    return i ? [i] : [];
  });
}

/* Answers the candidate wrote down in the answer notebook, by question. They outlive the interviews they came from. */
export interface Script {
  question: string;
  text: string;
  at: number;
}
export function loadScripts(): Record<string, Script> {
  const s = read<Record<string, Script>>(KEYS.scripts, {});
  return s && typeof s === "object" && !Array.isArray(s) ? s : {};
}
export function saveScript(key: string, question: string, text: string): boolean {
  const all = loadScripts();
  if (text.trim()) all[key] = { question, text, at: Date.now() };
  else delete all[key];
  return write(KEYS.scripts, all);
}

/* In-progress interview, so a refresh or closed tab doesn't lose everything. */
export interface ActiveInterview {
  interview: Interview;
  elapsedSec: number;
  savedAt: number;
}
const ACTIVE_TTL_MS = 24 * 60 * 60 * 1000;

export const saveActiveInterview = (a: ActiveInterview) => write(KEYS.active, a);
export const clearActiveInterview = () => remove(KEYS.active);
export function loadActiveInterview(): ActiveInterview | null {
  const a = read<ActiveInterview | null>(KEYS.active, null);
  if (!a || !a.interview || !Array.isArray(a.interview.questions) || !a.interview.config) return null;
  if (Date.now() - a.savedAt > ACTIVE_TTL_MS || !a.interview.questions.length) {
    clearActiveInterview();
    return null;
  }
  return a;
}

export const loadLastConfig = (): Partial<InterviewConfig> | null => read(KEYS.lastConfig, null);
export const saveLastConfig = (c: InterviewConfig) => write(KEYS.lastConfig, { ...c, documents: undefined, preset: undefined });

/* The résumé / cover letter, kept in this browser only when the candidate ticks "remember". */
export function loadSavedDocuments(): Documents | null {
  const d = read<Documents | null>(KEYS.documents, null);
  return d && typeof d.resume === "string" && typeof d.coverLetter === "string" ? d : null;
}
export const saveDocuments = (d: Documents) => write(KEYS.documents, d);
export const forgetDocuments = () => remove(KEYS.documents);

/** Most recent previous interview for comparison (same position preferred). */
export function previousFor(i: Interview): InterviewSummary | null {
  const others = loadHistory().filter((x) => x.id !== i.id && x.createdAt < i.createdAt);
  return others.find((x) => x.position === i.config.position) ?? others[0] ?? null;
}

/* 1분 자기소개 attempts, newest first. */
const MAX_INTRO_ATTEMPTS = 20;
export function loadIntroAttempts(): IntroAttempt[] {
  const list = read<IntroAttempt[]>(KEYS.intro, []);
  return Array.isArray(list) ? list.filter((a) => a && typeof a.text === "string" && typeof a.score === "number") : [];
}
export function saveIntroAttempt(a: IntroAttempt): boolean {
  return write(KEYS.intro, [a, ...loadIntroAttempts()].slice(0, MAX_INTRO_ATTEMPTS));
}
