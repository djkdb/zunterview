/**
 * 면접 준비 플랜: the candidate sets the real interview date, and each day until then gets a
 * short list of practice tasks built from what this browser already knows (weak questions,
 * question kinds never answered, the self-introduction). Tasks tick themselves off from what
 * was actually done that day. Everything stays in the browser.
 */
import type { Interview } from "../types/interview";
import type { IntroAttempt } from "./intro";
import type { Script } from "./storage";

export interface InterviewPlan {
  /** "YYYY-MM-DD" in local time. */
  date: string;
  company: string;
  position: string;
  createdAt: number;
}

export type TaskKind = "intro" | "full" | "weak" | "gaps" | "script" | "rehearsal" | "review";

export interface PlanTask {
  kind: TaskKind;
  title: string;
  detail: string;
  done: boolean;
}

export interface PlanDay {
  date: string;
  /** Days left until the interview on this day (0 = the interview day). */
  dLeft: number;
  tasks: PlanTask[];
}

/** What the browser knows about the candidate's practice. */
export interface PracticeState {
  interviews: Interview[];
  intros: IntroAttempt[];
  scripts: Script[];
  weakQuestions: number;
  gapKinds: number;
}

export const dayKey = (t: number | Date) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};

const INTRO_GOOD = 70;

/** Did the candidate do this task on that day? */
function doneOn(kind: TaskKind, day: string, s: PracticeState): boolean {
  const interviewsThatDay = s.interviews.filter((i) => i.completed && dayKey(i.createdAt) === day);
  switch (kind) {
    case "intro":
      return s.intros.some((a) => dayKey(a.at) === day);
    case "full":
    case "rehearsal":
      return interviewsThatDay.some((i) => !i.config.preset?.length);
    case "weak":
    case "gaps":
      return interviewsThatDay.some((i) => Boolean(i.config.preset?.length)) || s.interviews.some((i) => (i.reanswers ?? []).some((r) => dayKey(r.at) === day));
    case "script":
      return s.scripts.some((x) => dayKey(x.at) === day);
    case "review":
      return false;
  }
}

const TASK: Record<TaskKind, (p: InterviewPlan, s: PracticeState) => Omit<PlanTask, "done">> = {
  intro: (_p, s) => {
    const best = s.intros.reduce((m, a) => Math.max(m, a.score), 0);
    return {
      kind: "intro",
      title: "1분 자기소개 한 번",
      detail: best >= INTRO_GOOD ? `지금까지 최고 ${best}점입니다. 시간을 재며 한 번 더 말해 보세요.` : s.intros.length ? `지금까지 최고 ${best}점입니다. ${INTRO_GOOD}점을 넘을 때까지 고쳐 보세요.` : "시간을 재며 소리 내어 말해 보세요.",
    };
  },
  full: (p) => ({ kind: "full", title: `${p.company ? `${p.company} ` : ""}${p.position} 모의면접 한 번`, detail: "처음부터 끝까지 실전처럼 답하고 평가표를 확인하세요." }),
  weak: (_p, s) => ({ kind: "weak", title: "약했던 질문 다시 답하기", detail: `60점 아래였던 질문 ${s.weakQuestions}개가 있습니다. 답변 노트에서 그 질문으로 면접을 보세요.` }),
  gaps: (_p, s) => ({ kind: "gaps", title: "빈칸 유형 채우기", detail: `아직 답해 보지 않았거나 약한 질문 유형이 ${s.gapKinds}개입니다. 경험 지도에서 빈칸 질문으로 면접을 보세요.` }),
  script: () => ({ kind: "script", title: "실전 답 하나 적어 두기", detail: "답변 노트에서 가장 자주 받은 질문의 답을 적어 두세요." }),
  rehearsal: (p) => ({ kind: "rehearsal", title: "마지막 리허설", detail: `${p.company ? `${p.company} ` : ""}같은 조건으로 면접을 한 번 더 보고, 답을 가린 채 노트를 훑어보세요.` }),
  review: () => ({ kind: "review", title: "면접 당일", detail: "새 연습보다 답변 노트에 적어 둔 답과 자기소개만 소리 내어 한 번씩 읽어 보세요." }),
};

/** Which tasks a day gets, by how far it is from the interview. */
function kindsFor(dLeft: number, index: number, s: PracticeState): TaskKind[] {
  if (dLeft === 0) return ["review"];
  if (dLeft === 1) return ["rehearsal", "intro"];
  const rotation: TaskKind[][] = [
    ["intro", "full"],
    [s.weakQuestions ? "weak" : "full", s.gapKinds ? "gaps" : "script"],
    ["intro", "script"],
  ];
  // The first day always starts with the self-introduction and one full interview.
  return index === 0 ? ["intro", "full"] : rotation[index % rotation.length];
}

/** The days from today toward the interview (two weeks at most), each with its tasks. */
export function buildPlan(plan: InterviewPlan, s: PracticeState, today: string): PlanDay[] {
  const left = daysBetween(today, plan.date);
  if (left < 0) return [];
  const out: PlanDay[] = [];
  for (let k = 0; k <= Math.min(left, 13); k++) {
    const date = addDays(today, k);
    const dLeft = left - k;
    out.push({ date, dLeft, tasks: kindsFor(dLeft, k, s).map((kind) => ({ ...TASK[kind](plan, s), done: date <= today && doneOn(kind, date, s) })) });
  }
  return out;
}

export const dLabel = (n: number) => (n === 0 ? "D-day" : `D-${n}`);
