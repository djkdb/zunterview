/**
 * The answer notebook: every question from the interviews kept in this browser, with the
 * candidate's latest answer, the interviewer's note, and the answer they wrote down to say next time.
 */
import type { Interview, QuestionType } from "../types/interview";
import { getCompany } from "../../shared/companies";
import type { Script } from "./storage";

export const NOTE_GROUPS = ["intro", "experience", "role", "situation"] as const;
export type NoteGroup = (typeof NOTE_GROUPS)[number];

export const NOTE_GROUP_KO: Record<NoteGroup, string> = {
  intro: "자기소개·지원동기",
  experience: "경험·인성",
  role: "직무",
  situation: "상황 대처",
};

const GROUP_OF: Record<QuestionType, NoteGroup> = {
  opening: "intro",
  motivation: "intro",
  company_understanding: "intro",
  behavioral: "experience",
  experience: "experience",
  deep_dive: "experience",
  leadership: "experience",
  communication: "experience",
  ethics: "experience",
  challenge: "experience",
  reflection: "experience",
  result: "experience",
  role_understanding: "role",
  role_specific: "role",
  technical: "role",
  case: "role",
  numerical: "role",
  analytical: "role",
  industry: "role",
  pt: "role",
  debate: "role",
  situational: "situation",
};

/** Same question, different punctuation or spacing → same note. */
export const noteKey = (question: string) =>
  question
    .replace(/\s+/g, " ")
    .replace(/[\s.?!。？]+$/, "")
    .trim();

export interface Attempt {
  interviewId: string;
  at: number;
  /** "토스 프론트엔드" or just the position. */
  where: string;
  answer: string;
  score: number;
  improve: string;
  example: string;
  /** The question this follow-up came from. */
  parent?: string;
}

export interface Note {
  key: string;
  question: string;
  group: NoteGroup | null;
  isFollowUp: boolean;
  /** Newest first. Re-answers from the result sheet count as attempts. */
  attempts: Attempt[];
  best: number | null;
  script?: Script;
}

export function buildNotebook(interviews: Interview[], scripts: Record<string, Script>): Note[] {
  const notes = new Map<string, Note>();
  for (const i of interviews) {
    const company = getCompany(i.config.companyId);
    const where = company ? `${company.shortName ?? company.name} ${i.config.position}` : i.config.position;
    for (const q of i.questions) {
      if (!q.answer || q.score === null || !q.feedback) continue;
      const parent = q.parentId ? i.questions.find((p) => p.id === q.parentId)?.text : undefined;
      // A follow-up like "조금 더 구체적으로 말씀해 주시겠어요?" means something different under each main question.
      const key = parent ? `${noteKey(parent)} ↳ ${noteKey(q.text)}` : noteKey(q.text);
      const note = notes.get(key) ?? { key, question: q.text, group: GROUP_OF[q.type] ?? null, isFollowUp: q.isFollowUp, attempts: [], best: null };
      const base = { interviewId: i.id, where, ...(parent ? { parent } : {}) };
      note.attempts.push({ ...base, at: q.askedAt || i.createdAt, answer: q.answer, score: q.score, improve: q.feedback.improve, example: q.feedback.betterAnswer.example });
      for (const r of i.reanswers ?? []) {
        if (r.questionId !== q.id) continue;
        note.attempts.push({ ...base, at: r.at, answer: r.answer, score: r.score, improve: r.feedback.improve, example: r.feedback.betterAnswer.example });
      }
      notes.set(key, note);
    }
  }
  for (const [key, script] of Object.entries(scripts)) {
    const note = notes.get(key);
    if (note) note.script = script;
    else notes.set(key, { key, question: script.question, group: null, isFollowUp: false, attempts: [], best: null, script });
  }
  return [...notes.values()].map((n) => {
    const attempts = [...n.attempts].sort((a, b) => b.at - a.at);
    return { ...n, attempts, best: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null };
  });
}

export const REVIEW_BELOW = 60;

/** Weakest first (a question never answered well is what to review), then the ones asked most often. */
export function sortForReview(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => (a.best ?? 101) - (b.best ?? 101) || b.attempts.length - a.attempts.length);
}

export function notebookText(notes: Note[]): string {
  const lines = ["면접 답변 노트", `정리한 날: ${new Date().toLocaleDateString("ko-KR")}`, ""];
  notes.forEach((n, idx) => {
    const last = n.attempts[0];
    lines.push(`${idx + 1}. ${n.question}`);
    if (n.script) lines.push(`  내가 정리한 답: ${n.script.text.trim()}`);
    if (last) {
      lines.push(`  최근 답변(${last.score}점): ${last.answer.trim()}`);
      lines.push(`  고칠 점: ${last.improve}`);
      lines.push(`  예시(참고용): ${last.example}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}
