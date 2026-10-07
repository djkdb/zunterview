/**
 * 경험 지도: which of the candidate's experiences they used for which kinds of questions,
 * across the interviews kept in this browser. Shows the kinds never answered, the weak ones,
 * and one story leaned on for everything. Read from the answers; nothing is sent anywhere.
 */
import type { Interview, PresetQuestion, QuestionType } from "../types/interview";
import { readSignals } from "../services/ai/mock/signals";

export const COMPETENCIES = ["intro", "motivation", "conflict", "failure", "result", "leadership", "role"] as const;
export type Competency = (typeof COMPETENCIES)[number];

export const COMPETENCY_KO: Record<Competency, string> = {
  intro: "자기소개",
  motivation: "지원동기",
  conflict: "협업·갈등",
  failure: "실패·극복",
  result: "성과",
  leadership: "주도·리더십",
  role: "직무 역량",
};

/** A question to practise each kind with, when it has never come up. */
const GAP_QUESTION: Record<Competency, (position: string) => PresetQuestion> = {
  intro: () => ({ text: "먼저 1분 동안 간단하게 자기소개 부탁드립니다.", type: "opening" }),
  motivation: (p) => ({ text: `${p} 직무에 지원하신 이유를 말씀해 주세요.`, type: "motivation" }),
  conflict: () => ({ text: "팀에서 의견이 크게 달랐을 때 어떻게 합의했는지 경험을 말씀해 주세요.", type: "behavioral" }),
  failure: () => ({ text: "계획대로 되지 않았던 경험과 그때 어떻게 대처했는지 말씀해 주세요.", type: "reflection" }),
  result: () => ({ text: "가장 큰 성과를 냈던 경험을 결과 수치와 함께 말씀해 주세요.", type: "result" }),
  leadership: () => ({ text: "누가 시키지 않았는데 먼저 나서서 바꾼 일이 있다면 말씀해 주세요.", type: "leadership" }),
  role: (p) => ({ text: `${p} 업무에 바로 쓸 수 있는 본인의 역량을 경험과 함께 말씀해 주세요.`, type: "role_specific" }),
};

export const gapQuestion = (c: Competency, position: string): PresetQuestion => GAP_QUESTION[c](position || "지원하신");

const BY_TEXT: [RegExp, Competency][] = [
  [/자기\s?소개(?!서)/, "intro"],
  [/지원(?:하신|한|하게 된)?\s?(?:이유|동기|계기)|입사\s?후|왜\s.*지원/, "motivation"],
  [/갈등|의견\s?(?:차이|이\s?(?:달|갈|맞지))|반대|설득|합의|협업|동료|팀원/, "conflict"],
  [/실패|실수|어려웠|힘들었|극복|계획대로|위기|좌절/, "failure"],
  [/성과|달성|가장\s?(?:큰|자랑)|결과\s?수치|기여한/, "result"],
  [/리더|이끌|주도|먼저\s?나서|책임지고|앞장/, "leadership"],
];

const BY_TYPE: Partial<Record<QuestionType, Competency>> = {
  opening: "intro",
  motivation: "motivation",
  company_understanding: "motivation",
  communication: "conflict",
  challenge: "failure",
  reflection: "failure",
  result: "result",
  leadership: "leadership",
  role_specific: "role",
  role_understanding: "role",
  technical: "role",
  case: "role",
  numerical: "role",
  analytical: "role",
  industry: "role",
};

/** What kind of question it is; situational and ethics questions ask for judgment, not a story. */
export function competencyOf(question: string, type: QuestionType): Competency | null {
  if (type === "situational" || type === "ethics" || type === "pt" || type === "debate") return null;
  for (const [re, c] of BY_TEXT) if (re.test(question)) return c;
  return BY_TYPE[type] ?? null;
}

const EXPERIENCE_NOUN = /(동아리|학생회|인턴십|인턴|아르바이트|알바|공모전|현장실습|실습|봉사활동|학회|프로젝트|교환학생|부트캠프|창업|대외활동|군\s?복무)/;
const HEAD = /([가-힣A-Za-z0-9]{2,10})\s?$/;
const NOT_HEAD = /(?:는|은|한|된|던|할|될|에서|으로|로|을|를|이|가|의|와|과|도|팀|그|이번|해당|여러|모든|저희|우리)$/;

/** The experience an answer is about: "졸업 프로젝트", "편의점 아르바이트", "동아리". Empty when none is named. */
export function experienceOf(answer: string): string {
  const s = readSignals(answer, "", "ko");
  if (s.project) return s.project;
  const m = EXPERIENCE_NOUN.exec(answer);
  if (!m) return "";
  const before = answer.slice(0, m.index);
  const head = HEAD.exec(before)?.[1];
  const noun = m[1].replace(/\s/g, " ");
  return head && !NOT_HEAD.test(head) ? `${head} ${noun}` : noun;
}

export interface StoryUse {
  interviewId: string;
  at: number;
  question: string;
  score: number;
  competency: Competency | null;
}

export interface Story {
  name: string;
  uses: StoryUse[];
  /** Best score in each kind of question this story was used for. */
  best: Partial<Record<Competency, number>>;
}

export interface Coverage {
  answers: number;
  best: number | null;
  stories: string[];
}

export interface StoryMap {
  stories: Story[];
  /** Answers that named no experience at all. */
  unnamed: StoryUse[];
  coverage: Record<Competency, Coverage>;
  /** Never answered. */
  missing: Competency[];
  /** Answered, but never above 60. */
  weak: Competency[];
  /** One story carrying most of the interviews. */
  overused: Story | null;
  answers: number;
}

export const WEAK_BELOW = 60;

/** "아르바이트" and "편의점 아르바이트" are the same story when there's only one longer name for it. */
function mergeNames(names: string[]): Map<string, string> {
  const to = new Map<string, string>();
  for (const n of names) {
    const longer = names.filter((o) => o !== n && o.endsWith(` ${n}`));
    to.set(n, longer.length === 1 ? longer[0] : n);
  }
  return to;
}

export function buildStoryMap(interviews: Interview[]): StoryMap {
  const raw: { name: string; use: StoryUse }[] = [];
  for (const i of interviews) {
    if (i.config.language !== "ko") continue;
    for (const q of i.questions) {
      if (!q.answer || q.score === null || !q.feedback) continue;
      // A follow-up belongs to its main question's kind and, unless it names another, its story.
      const main = q.parentId ? i.questions.find((p) => p.id === q.parentId) : undefined;
      const competency = main ? competencyOf(main.text, main.type) : competencyOf(q.text, q.type);
      const parentStory = main?.answer ? experienceOf(main.answer) : "";
      raw.push({ name: experienceOf(q.answer) || parentStory, use: { interviewId: i.id, at: q.askedAt || i.createdAt, question: q.text, score: q.score, competency } });
    }
  }
  const merged = mergeNames([...new Set(raw.map((r) => r.name).filter(Boolean))]);
  const byName = new Map<string, Story>();
  const unnamed: StoryUse[] = [];
  for (const { name, use } of raw) {
    if (!name) {
      unnamed.push(use);
      continue;
    }
    const key = merged.get(name) ?? name;
    const story = byName.get(key) ?? { name: key, uses: [], best: {} };
    story.uses.push(use);
    if (use.competency) story.best[use.competency] = Math.max(story.best[use.competency] ?? 0, use.score);
    byName.set(key, story);
  }
  const stories = [...byName.values()].sort((a, b) => b.uses.length - a.uses.length);

  const coverage = Object.fromEntries(COMPETENCIES.map((c) => [c, { answers: 0, best: null as number | null, stories: [] as string[] }])) as Record<Competency, Coverage>;
  for (const { name, use } of raw) {
    if (!use.competency) continue;
    const cov = coverage[use.competency];
    cov.answers++;
    cov.best = Math.max(cov.best ?? 0, use.score);
    const key = name ? (merged.get(name) ?? name) : "";
    if (key && !cov.stories.includes(key)) cov.stories.push(key);
  }
  const named = stories.reduce((n, s) => n + s.uses.length, 0);
  const top = stories[0];
  // Most of the named answers, or half of them spread over three or more kinds of question.
  const share = top ? top.uses.length / Math.max(1, named) : 0;
  const overused = top && named >= 4 && (share >= 0.6 || (share >= 0.5 && Object.keys(top.best).length >= 3)) ? top : null;

  return {
    stories,
    unnamed,
    coverage,
    missing: COMPETENCIES.filter((c) => coverage[c].answers === 0),
    weak: COMPETENCIES.filter((c) => coverage[c].answers > 0 && (coverage[c].best ?? 0) < WEAK_BELOW),
    overused,
    answers: raw.length,
  };
}
