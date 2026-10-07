/**
 * The mock interviewer's rulebook. Each rule mirrors a line of the AI interviewer's system
 * prompt (server/prompts/analysisPrompt.ts, followupPrompt.ts) so both interviewers judge an
 * answer the same way. docs/PROMPTS.md keeps the rule-by-rule comparison.
 */
import { hasBatchim, josa } from "../../../../shared/korean";
import type { Signals } from "./signals";

/* ───────────────────────────── reading the answer ───────────────────────────── */

const BACKGROUND_START = /^(?:저는\s)?(?:대학|학교|\d+\s?학년|당시|예전|처음|어릴|입사|군\s?복무|휴학|이전\s?회사|작년|재작년|\d{4}년)/;
const PAST = /(?:했|었|았|였|됐|봤|줬|왔|냈|썼|렸|웠)(?:습니다|어요|고|는데|으며|지만)/;
const PLAN = /(?:겠습니다|겠어요|하겠|싶습니다|싶어요|할\s?예정|저라면)/;

/**
 * The sentence that best tells what the candidate did: past tense, ideally naming a method or
 * tool and the candidate as the subject, and not the scene-setting first line.
 */
export function actionSentence(s: Signals): string {
  let best = "";
  let bestScore = 0;
  for (const x of s.sentences) {
    if (!PAST.test(x)) continue;
    const named = [...s.methods, ...s.techs].some((m) => x.includes(m)) ? 3 : 0;
    const score = 1 + named + (/저는|제가|직접/.test(x) ? 2 : 0) + (/만들|개선|줄였|늘렸|정리|도입|제안|분석|추가|바꿨|설계|확인/.test(x) ? 1 : 0) - (BACKGROUND_START.test(x) || /맡게\s?되었/.test(x) ? 3 : 0);
    if (score > bestScore) {
      best = x;
      bestScore = score;
    }
  }
  return best;
}

/** A sentence that reports how things turned out. */
export function resultSentence(s: Signals): string {
  return s.sentences.find((x) => /결과|덕분에|그래서|줄었|늘었|줄였|늘렸|올랐|높였|낮췄|달성|개선됐|해결됐|\d\s?%|\d+배/.test(x)) ?? "";
}

/** The question asked about the past ("~했던 경험", "~하셨나요", "사례") rather than a hypothetical. */
export function asksForExperience(question: string): boolean {
  return /경험|사례|했던|있었던|하셨|해\s?보신|겪으신|가장\s?(?:어려웠|힘들었|기억에)/.test(question) && !/(?:한다면|라면|하시겠|어떻게\s?하실)/.test(question);
}

/**
 * AI prompt: "Only ask 'how did you …' about things the candidate said they actually did. A plan,
 * a wish or a hypothetical is not an experience." For scoring: an experience question answered
 * only with plans.
 */
export function plannedInsteadOfDone(question: string, answer: string): boolean {
  return asksForExperience(question) && PLAN.test(answer) && !PAST.test(answer);
}

/** An experience question answered with no past event at all: only attitudes ("항상 ~하려고 노력합니다"). */
export function noStory(question: string, answer: string): boolean {
  return asksForExperience(question) && !PAST.test(answer) && !PLAN.test(answer) && answer.replace(/\s/g, "").length >= 25;
}

const ANSWER_START = /결론부터|핵심은|가장\s?\S+\s?(?:것|점|경험)은|이유는|저는\s?\S+(?:라고|다고)\s?(?:생각|봅니다|판단)|입니다\.?$|습니다\.?$/;

/**
 * 결론 먼저: does the first sentence answer the question, or open with background?
 * Only judged for answers long enough that the order matters.
 */
export function conclusionFirst(s: Signals): "first" | "late" | null {
  if (s.chars < 70 || s.sentences.length < 3) return null;
  const first = s.sentences[0];
  if (/결론부터|핵심은|이유는/.test(first)) return "first";
  if (BACKGROUND_START.test(first) && first.length > 25) return "late";
  return ANSWER_START.test(first) && first.length <= 70 ? "first" : null;
}

/** Concrete material the score can stand on: numbers, named methods or tools, an owned project. */
export function hasEvidence(s: Signals): boolean {
  return s.numbers.length > 0 || s.methods.length > 0 || s.techs.length > 0 || Boolean(s.project || s.roleClaim);
}

/* ───────────────────────────── calibration ───────────────────────────── */

/**
 * AI prompt calibration, applied after the mock's length-and-signal scoring:
 * - "85+ only with clear, specific evidence in the answer."
 * - "60-75 for reasonable but generic answers."
 * - "Below 30 for a bare resolution with no content."
 * An experience question answered with plans is capped like a generic answer.
 */
export const CAP = { generic: 75, plannedOnly: 58, noStory: 50, platitude: 28, strongWithoutNumbers: 86 } as const;

export function capFor(s: Signals, opts: { platitude: boolean; plannedOnly: boolean; noStory?: boolean }): number {
  if (opts.platitude) return CAP.platitude;
  if (opts.noStory) return CAP.noStory;
  if (opts.plannedOnly) return CAP.plannedOnly;
  if (!hasEvidence(s)) return CAP.generic;
  if (!s.numbers.length) return CAP.strongWithoutNumbers;
  return 100;
}

/* ───────────────────────────── rewriting the candidate's own words ───────────────────────────── */

const JONG_B = 17; // ㅂ as a final consonant

/** "하" → "합", "되" → "됩": adds ㅂ under a syllable that has no final consonant. */
function withB(syllable: string): string {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171 || code % 28 !== 0) return syllable;
  return String.fromCharCode(0xac00 + code + JONG_B);
}

/** Present-tense formal ending for a verb stem: "맞" → "맞습니다", "하" → "합니다". */
function formal(stem: string): string {
  const last = stem.slice(-1);
  return hasBatchim(last) ? `${stem}습니다` : `${stem.slice(0, -1)}${withB(last)}니다`;
}

/** Adjectives whose "~은 것 같습니다" is a present judgment ("좋은 것 같습니다" → "좋습니다"). */
const ADJ_EUN = /(?:좋|많|작|높|낮|같|넓|깊|적|괜찮|맞)은$/;

/**
 * A hedged sentence said plainly: "꼼꼼한 편인 것 같습니다" → "꼼꼼한 편입니다",
 * "제가 정리했던 것 같습니다" → "제가 정리했습니다", "영업이 맞는 것 같아요" → "영업이 맞습니다".
 * Returns null when the ending is ambiguous: "정리한 것 같습니다" may be past or present
 * ("꼼꼼한"), so it is left alone rather than rewritten into the wrong tense.
 */
export function assertive(sentence: string): string | null {
  const m = /(\S+?)\s?것\s?같(?:습니다|아요|네요|다)([.!?]?)\s*$/.exec(sentence.trim());
  if (!m) return null;
  const head = sentence.trim().slice(0, m.index);
  const word = m[1];
  const end = m[2] || ".";
  let out: string | null = null;
  if (/(?:했|었|았|였|됐|봤)던$/.test(word)) out = `${word.slice(0, -1)}습니다`;
  else if (word.endsWith("인")) out = `${word.slice(0, -1)}입니다`;
  else if (word.endsWith("는") && word.length >= 2) out = formal(word.slice(0, -1));
  else if (ADJ_EUN.test(word)) out = `${word.slice(0, -1)}습니다`;
  return out ? `${head}${out}${end}` : null;
}

/** "…개선했고, …" / "…있었는데, …" → two sentences. Null when there is nothing to split. */
export function splitLong(sentence: string): string | null {
  const m = /^(.{8,}?(?:했|었|았|였|됐|냈|썼|봤|줬|왔|렸|웠))(고|는데|으며|지만),?\s+(.{8,})$/.exec(sentence.trim());
  if (!m) return null;
  return `${m[1]}습니다. ${m[2] === "지만" ? "하지만 " : ""}${m[3]}`;
}

/** "약간 사람 만나는 걸 좋아합니다" → "사람 만나는 걸 좋아합니다" ("좀 더" stays). */
export function withoutFillers(sentence: string): string {
  const words = sentence.trim().split(/\s+/);
  return words.filter((w, i) => !/^(?:음+|어+|약간|뭔가|그냥|되게|막|좀)$/.test(w) || (w === "좀" && words[i + 1]?.startsWith("더"))).join(" ");
}

/** "안녕하십니까.", "지원자 한지수입니다." carry nothing an example should repeat. */
const GREETING_OR_NAME = /^(?:안녕하(?:세요|십니까)|반갑습니다)|^(?:저는\s?)?(?:지원자\s?)?[가-힣]{2,4}입니다\.?$/;

const strip = (x: string) => x.trim().replace(/[.!?]+$/, "");
const quote = (x: string) => `“${x}”`;

/** "~으로/로" after a word. */
export function ro(word: string): string {
  const last = word.slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[036]$/.test(last) ? "으로" : "로";
  const jong = code % 28;
  return jong === 0 || jong === 8 ? "로" : "으로"; // no final consonant, or ㄹ
}

/**
 * AI prompt: "betterAnswer … an illustrative example sentence. The example must not state new
 * facts as if they were the candidate's — use [bracketed placeholders]." The mock keeps the
 * candidate's own sentence and puts a placeholder only where the missing piece goes.
 */
export function exampleFromAnswer(category: string, s: Signals): string | null {
  if (s.lang !== "ko" || s.chars < 25) return null;
  if (s.hedges >= 2) category = "confidence";
  const action = actionSentence(s);
  const result = resultSentence(s);
  switch (category) {
    case "specificity":
      return action && !s.numbers.length ? quote(`${strip(action)}. 그 결과 [지표]가 [이전 수치]에서 [바뀐 수치]로 달라졌습니다.`) : null;
    case "logic":
      return action ? quote(`${strip(action)}. [다른 방법]도 검토했지만 [판단 기준] 때문에 이 방법을 골랐습니다.`) : null;
    case "structure": {
      if (!action) return null;
      const lead = result && result !== action ? strip(result) : "[결과 한 문장]";
      const context = s.sentences.find((x) => x !== action && x !== result && !GREETING_OR_NAME.test(x)) ?? "";
      return quote(`${lead}. ${context ? `${strip(context)}. ` : ""}${strip(action)}.`);
    }
    case "relevance":
      return quote(`결론부터 말씀드리면 [질문에 대한 답 한 문장]입니다. 예를 들어 ${strip(action || s.sentences[0])}.`);
    case "plan":
      return quote("[비슷했던 상황]에서 저는 [실제로 한 일]을 했고, [결과]가 있었습니다. 같은 일이 생기면 그때처럼 [할 일]부터 하겠습니다.");
    case "story":
      return quote("[언제, 어디서] [어떤 문제]가 있었고, 저는 [직접 한 일]을 했습니다. 그 결과 [달라진 것]이 있었습니다.");
    case "confidence": {
      const hedged = s.sentences.find((x) => /것\s?같/.test(x));
      const plain = hedged ? assertive(hedged) : null;
      if (plain) return quote(withoutFillers(plain));
      return s.project ? quote(`${s.project}에서 저는 [직접 맡은 일]을 했고, [결정한 것]은 제가 정했습니다.`) : null;
    }
    case "communication": {
      const longest = [...s.sentences].sort((a, b) => b.length - a.length)[0] ?? "";
      const split = longest.length > 70 ? splitLong(longest) : null;
      return split ? quote(split) : null;
    }
  }
  return null;
}

/* ───────────────────────────── feedback in the candidate's words ───────────────────────────── */

const short = (x: string, n = 28) => {
  const t = strip(x);
  return t.length > n ? `${t.slice(0, n).trim()}…` : t;
};

/** AI prompt: "Every reason must point to something in the answer or something missing from it." */
export function improveFromAnswer(category: string, s: Signals, opts: { late: boolean; plannedOnly: boolean; noStory?: boolean }): string | null {
  if (s.lang !== "ko" || s.chars < 25) return null;
  if (opts.noStory) return "실제로 겪은 일을 물었는데, 평소의 생각과 태도만 말했습니다. 한 가지 사례를 골라 그때 무엇을 했고 어떻게 됐는지를 말하세요.";
  // Hedging is the first thing a listener notices; it comes before the weakest score.
  if (s.hedges >= 2 && category !== "plan") category = "confidence";
  if (opts.plannedOnly) return "질문은 실제로 해 본 일을 물었는데, 앞으로 하겠다는 계획으로 답했습니다. 비슷한 일을 해 본 경험이 있으면 그 이야기를 하고, 없다면 없다고 말한 뒤 계획을 말하세요.";
  const action = actionSentence(s);
  switch (category) {
    case "specificity":
      return action && !s.numbers.length ? `‘${short(action)}’까지는 말했지만 그래서 무엇이 얼마나 달라졌는지가 없습니다. 전후 수치를 한 문장 붙이세요.` : null;
    case "logic": {
      const what = s.methods[0] ?? s.techs[0];
      return what ? `‘${what}’ 부분에서 왜 그 방법을 골랐는지가 빠졌습니다. 다른 선택지와 고른 이유를 한 문장 넣으세요.` : action ? `‘${short(action)}’에서 왜 그렇게 판단했는지가 빠졌습니다. 이유를 한 문장 넣으세요.` : null;
    }
    case "structure":
      return opts.late ? `첫 문장 ‘${short(s.sentences[0], 22)}’이 배경 설명이라 결론이 늦게 나옵니다. 무엇을 했고 어떻게 됐는지를 첫 문장에 두세요.` : null;
    case "relevance":
      return opts.late ? `첫 문장이 배경 설명이라 질문에 대한 답이 늦게 나옵니다. 답을 먼저 말하고 배경은 뒤에 붙이세요.` : null;
    case "confidence": {
      const hedged = s.sentences.find((x) => /것\s?같/.test(x));
      if (hedged) return `‘${short(hedged)}’처럼 끝을 흐리면 확신이 없어 보입니다. 해 본 일은 ‘~했습니다’로, 판단은 ‘~라고 봤습니다’로 끝내세요.`;
      return s.teamOnly ? "‘저희 팀’이 한 일은 들었지만 본인이 한 일이 따로 나오지 않았습니다. ‘저는 ~을 맡아 ~했습니다’처럼 말하세요." : null;
    }
    case "communication": {
      const longest = [...s.sentences].sort((a, b) => b.length - a.length)[0] ?? "";
      return longest.length > 70 ? `한 문장이 ${longest.replace(/\s/g, "").length}자로 깁니다. ‘${short(longest, 20)}’ 문장을 두 문장으로 나누세요.` : null;
    }
  }
  return null;
}

/** AI prompt: "strength: if nothing in the answer deserves praise, say so plainly." Grounded when possible. */
export function strengthFromAnswer(category: string, s: Signals): string | null {
  if (s.lang !== "ko" || s.chars < 25) return null;
  switch (category) {
    case "specificity":
      if (s.metric) return `‘${s.metric}’처럼 결과를 수치로 말했습니다.`;
      return s.methods[0] ? `‘${s.methods[0]}’처럼 실제로 쓴 방법을 말했습니다.` : null;
    case "logic": {
      const why = s.sentences.find((x) => /때문|이유|그래서|덕분|위해/.test(x));
      return why ? `‘${short(why, 24)}’처럼 판단의 이유를 함께 말했습니다.` : null;
    }
    case "confidence": {
      const own = s.sentences.find((x) => /저는|제가/.test(x) && PAST.test(x));
      return own ? `‘${short(own, 24)}’처럼 본인이 한 일을 주어로 말했습니다.` : null;
    }
    case "structure":
      return resultSentence(s) && actionSentence(s) ? "한 일과 그 결과를 순서대로 말해 따라가기 쉬웠습니다." : null;
  }
  return null;
}

/**
 * AI prompt: "reaction: one natural spoken sentence … a brief acknowledgement for a strong answer,
 * or a gentle nudge when the answer was vague. Do not reveal scores … Vary the wording; avoid
 * stock lines." The mock acknowledges the concrete thing the candidate said, when there is one.
 */
export function groundedReaction(quality: string, s: Signals, seed: number): string | null {
  if (s.lang !== "ko") return null;
  if (quality === "strong" || quality === "adequate") {
    const options: string[] = [];
    if (s.metric) options.push(`네, ${s.metric}까지 말씀해 주셔서 이해가 됩니다.`);
    if (s.methods[0]) options.push(`네, ${s.methods[0]}${ro(s.methods[0])} 접근하셨군요.`);
    if (s.project) options.push(`네, ${s.project} 이야기는 잘 들었습니다.`);
    if (s.roleClaim) options.push(`네, ${s.roleClaim}${josa(s.roleClaim, "을/를")} 맡으셨군요.`);
    // Every third answer gets a plain acknowledgement, so the panel doesn't sound scripted.
    if (!options.length || seed % 3 === 0) return null;
    return options[seed % options.length];
  }
  if (quality === "vague" && s.project) return `${s.project} 이야기인 건 알겠습니다. 거기서 직접 하신 일을 조금 더 듣고 싶습니다.`;
  return null;
}
