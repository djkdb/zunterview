import { strongestAndWeakest } from "./scoring";
import { getCompany } from "../../shared/companies";
const KEYS = {
    summaries: "interview-ai:history:v1",
    interview: (id) => `interview-ai:interview:v1:${id}`,
    lastConfig: "interview-ai:last-config:v1",
    active: "interview-ai:active:v1",
    prefs: "interview-ai:prefs:v1",
};
const MAX_FULL_RECORDS = 10;
function read(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
}
function write(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    }
    catch {
        return false;
    }
}
function remove(key) {
    try {
        window.localStorage.removeItem(key);
    }
    catch {
        /* ignore */
    }
}
export function loadHistory() {
    const list = read(KEYS.summaries, []);
    return Array.isArray(list) ? list.filter((x) => x && typeof x.id === "string") : [];
}
export function toSummary(i) {
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
    };
}
/** Saves the summary and the full record (last N kept). Returns false if storage failed. */
export function saveInterview(i) {
    const list = loadHistory().filter((x) => x.id !== i.id);
    list.unshift(toSummary(i));
    const ok = write(KEYS.summaries, list.slice(0, 50));
    write(KEYS.interview(i.id), i);
    for (const old of list.slice(MAX_FULL_RECORDS))
        remove(KEYS.interview(old.id));
    return ok;
}
export function loadInterview(id) {
    const i = read(KEYS.interview(id), null);
    return i && Array.isArray(i.questions) && i.config ? i : null;
}
export function deleteInterview(id) {
    write(KEYS.summaries, loadHistory().filter((x) => x.id !== id));
    remove(KEYS.interview(id));
}
export function clearAllLocalData() {
    for (const s of loadHistory())
        remove(KEYS.interview(s.id));
    remove(KEYS.summaries);
    remove(KEYS.lastConfig);
    remove(KEYS.active);
    remove(KEYS.prefs);
}
const ACTIVE_TTL_MS = 24 * 60 * 60 * 1000;
export const saveActiveInterview = (a) => write(KEYS.active, a);
export const clearActiveInterview = () => remove(KEYS.active);
export function loadActiveInterview() {
    const a = read(KEYS.active, null);
    if (!a || !a.interview || !Array.isArray(a.interview.questions) || !a.interview.config)
        return null;
    if (Date.now() - a.savedAt > ACTIVE_TTL_MS || !a.interview.questions.length) {
        clearActiveInterview();
        return null;
    }
    return a;
}
export const loadLastConfig = () => read(KEYS.lastConfig, null);
export const saveLastConfig = (c) => write(KEYS.lastConfig, c);
/** Most recent previous interview for comparison (same position preferred). */
export function previousFor(i) {
    const others = loadHistory().filter((x) => x.id !== i.id && x.createdAt < i.createdAt);
    return others.find((x) => x.position === i.config.position) ?? others[0] ?? null;
}
