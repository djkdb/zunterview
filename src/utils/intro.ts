/**
 * 1분 자기소개 연습: the time it took, the parts a self-introduction is usually built from,
 * and earlier attempts. Everything here runs and stays in the browser.
 */
export const INTRO_QUESTION = "먼저 1분 동안 간단하게 자기소개 부탁드립니다.";

/** This practice's target band around one minute, in seconds. */
export const INTRO_TARGET = { min: 45, max: 75 } as const;

export type TimeVerdict = "short" | "good" | "long";

export function timeVerdict(seconds: number | null): TimeVerdict | null {
  if (seconds === null || seconds <= 0) return null;
  return seconds < INTRO_TARGET.min ? "short" : seconds > INTRO_TARGET.max ? "long" : "good";
}

export interface IntroCheck {
  key: "lead" | "story" | "number" | "role" | "close";
  label: string;
  ok: boolean;
  note: string;
}

const sentencesOf = (t: string) =>
  t
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const GREETING = /^(?:안녕하(?:세요|십니까)|반갑습니다)[.!,]?\s*/;
const NAME_ONLY = /^(?:저는\s?)?(?:[가-힣]{2,4}\s?)?(?:지원자\s?)?[가-힣]{2,4}입니다\.?$/;
const PAST = /(?:했|었|았|였|됐|봤|냈|썼)(?:습니다|어요|고|는데|으며|지만)/;
const CLOSE = /(?:겠습니다|싶습니다|되겠습니다|기여|보탬|성장하|함께하)/;

/** The sentence the panel hears first, after the greeting and the name. */
export function leadSentence(text: string): string {
  const s = sentencesOf(text.replace(GREETING, ""));
  return s.find((x) => !NAME_ONLY.test(x) && !GREETING.test(x)) ?? "";
}

export function introChecks(text: string, position: string): IntroCheck[] {
  const s = sentencesOf(text);
  const lead = leadSentence(text);
  const leadLen = lead.replace(/\s/g, "").length;
  const roleWords = position.split(/[\s·/()]+/).filter((w) => w.length >= 2);
  // The experience is the sentence with what was done and, ideally, a number; not the opening line.
  const story = s.find((x) => PAST.test(x) && /\d/.test(x) && x !== lead) ?? s.find((x) => PAST.test(x) && x !== lead) ?? s.find((x) => PAST.test(x));
  const last = s[s.length - 1] ?? "";
  return [
    {
      key: "lead",
      label: "나를 보여 주는 첫 문장",
      ok: Boolean(lead) && leadLen <= 60,
      note: !lead ? "인사와 이름 다음에 나를 한 줄로 보여 주는 문장이 없습니다." : leadLen <= 60 ? `‘${lead}’` : `첫 문장이 ${leadLen}자로 깁니다. 한 번에 기억될 한 줄로 줄여 보세요.`,
    },
    { key: "story", label: "근거가 되는 경험", ok: Boolean(story), note: story ? `‘${story}’` : "실제로 한 일이 나오지 않았습니다. 대표 경험 하나를 한두 문장으로 넣으세요." },
    { key: "number", label: "결과를 보여 주는 숫자", ok: /\d/.test(text), note: /\d/.test(text) ? "경험의 결과를 숫자로 말했습니다." : "기간, 인원, 개선 폭처럼 숫자 하나를 넣으면 기억에 남습니다." },
    {
      key: "role",
      label: "지원 직무와의 연결",
      ok: roleWords.some((w) => text.includes(w)) || /직무|이 일|업무|입사|지원/.test(text),
      note: "경험이 지원 직무에서 어떻게 쓰일지 한 문장으로 이어 주세요.",
    },
    { key: "close", label: "마무리 한 문장", ok: CLOSE.test(last), note: CLOSE.test(last) ? `‘${last}’` : "마지막에 입사 후 하고 싶은 일이나 각오를 한 문장으로 맺으세요." },
  ];
}

export interface IntroAttempt {
  at: number;
  text: string;
  /** Measured while speaking (voice answer or the read-aloud timer); null when only typed. */
  seconds: number | null;
  score: number;
  position: string;
}
