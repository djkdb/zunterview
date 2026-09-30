/**
 * What kind of reply the candidate gave, before any scoring — the things a real
 * interviewer reacts to first: a request to repeat the question, a rude or
 * meaningless reply, a flat refusal, or an answer that ignores the question.
 */
import type { Language } from "./schemas";
import { contentTerms, lexicalSimilarity } from "./similarity";

export type Triage = "clarify" | "hostile" | "nonsense" | "refuse";

const compact = (t: string) => t.replace(/\s+/g, "");

const CLARIFY =
  /질문(?:이|을|의)?\s?(?:잘\s?)?(?:이해|무슨|뭔|다시)|(?:무슨|어떤)\s?(?:말씀|뜻|의미)|이해가\s?(?:잘\s?)?안|이해\s?못|잘\s?못\s?알아|못\s?알아\s?들|다시\s?(?:한\s?번\s?)?(?:말씀|설명|질문)|(?:뭘|무엇을|뭐를|뭐라고)\s?(?:말|답|대답)해야|(?:뭘|뭐를|무엇을|무슨)\s?.{0,14}(?:해야|들어야|말해야)\s?(?:되|하)(?:죠|나요|는지|는데|요)|질문을?\s?(?:좀\s?)?쉽게|what do you mean|(?:could|can) you (?:repeat|rephrase|say that again)|(?:didn'?t|don'?t) understand the question|pardon\?|sorry\?$/i;

/** Swearing, including the common jamo spellings — never acceptable, wherever it appears ("시발점" is fine). */
const PROFANITY =
  /씨발|씨바|(?<![가-힣])시발(?!점|역|택시)|ㅅㅂ|ㅆㅂ|좆|존나|ㅈㄴ|병신|ㅂㅅ|븅신|개새|새끼|지랄|ㅈㄹ|엿\s?먹|미친\s?(?:놈|년|새)|fuck|shit|bitch/i;
/** Telling the interviewer off — only as the reply itself ("전원이 꺼지는 장애" is an answer). */
const RUDE = /꺼져|꺼지(?:쇼|세요|라|시오|시지)|닥쳐|닥치(?:세요|라|쇼|시지)|어쩌라고|알\s?바\s?(?:야|냐|아님)|너나\s?잘|웃기(?:네|시네|고\s?있네)|stfu|shut up|piss off/i;

const REFUSE =
  /^(?:싫어요?|싫습니다|싫은데요?|안\s?할래요?|대답\s?(?:안\s?할래요?|하기\s?싫(?:어요|습니다)?)|말\s?(?:안\s?할래요?|하기\s?싫(?:어요|습니다)?)|노\s?코멘트|그냥요?|글쎄요?|몰라도\s?돼요?|no comment|pass)[.!~…]*$/i;

/** Words any answer might use, whatever the question was about. */
const GENERIC = new Set("원인 확인 방법 이유 기준 판단 상황 문제 결과 과정 경우 부분 크게 제대 제대로 먼저 가장 실제 직접 무엇 어떤 어떻게 순서 차이 대상 목적 업무 일을 일이 필요 중요 점을 역할 경험 사례 본인 지원 하시 생각".split(" "));

/** Classify a reply. `null` means: an actual attempt at an answer — evaluate it normally. */
export function triageAnswer(answer: string, lang: Language): Triage | null {
  const t = answer.trim();
  const c = compact(t);
  if (!c) return "nonsense";
  // A short question back ("질문이 잘 이해가 안 돼요", "무슨 뜻이죠?") asks for the question again.
  if (c.length <= 50 && CLARIFY.test(t)) return "clarify";
  if ((PROFANITY.test(t) || RUDE.test(t)) && c.length <= 60) return "hostile";
  if (REFUSE.test(t)) return "refuse";
  // Keyboard mash, lone jamo, laughter, "ㅇㅇ", one repeated character, a single symbol.
  if (/^[ㄱ-ㅎㅏ-ㅣ.,!?~^;:\-_=+*/\\|'"`()[\]{}<>@#$%&0-9\s]+$/.test(t)) return "nonsense";
  if (/^(.)\1{3,}$/u.test(c)) return "nonsense";
  // Latin letters that are all keyboard mash ("asdf", "qwer", "jjjk", "sdfsdf").
  const latinWords = t.match(/[A-Za-z]+/g) ?? [];
  const mash = (w: string) => w.length >= 3 && (!/[aeiouy]/i.test(w) || /^(?:[asdfghjkl]+|[qwertyuiop]+|[zxcvbnm]+)$/i.test(w));
  const syllables = (t.match(/[가-힣]/g) ?? []).length;
  if (latinWords.length && latinWords.every(mash) && (lang === "en" || syllables === 0)) return "nonsense";
  return null;
}

/** Swearing anywhere in the reply. */
export function hasProfanity(answer: string): boolean {
  return PROFANITY.test(answer);
}

/** Conduct that ends a real interview on the spot: an insult as the reply, or swearing anywhere. */
export function isMisconduct(answer: string, lang: Language): boolean {
  return triageAnswer(answer, lang) === "hostile" || hasProfanity(answer);
}

/**
 * Share (0–1) of the question's content words the answer picks up; 1 when the question has almost
 * none. Only meaningful for questions about something specific — callers skip open questions
 * (self-introduction, motivation, reflection).
 */
export function questionCoverage(question: string, answer: string): { coverage: number; terms: string[] } {
  const q = contentTerms(question);
  const a = contentTerms(answer);
  const text = answer.toLowerCase();
  // Topic words only: predicates ("줄었", "이해했") and generic words ("원인", "확인") match any answer.
  const terms = [...q.words].filter((w) => w.length >= 2 && !GENERIC.has(w) && !/(?:었|았|였|했|는데|하게|스럽|적인|적으로)$/.test(w));
  const total = terms.length + q.canon.size;
  if (total < 2) return { coverage: 1, terms };
  let hits = 0;
  for (const w of terms) if (text.includes(w)) hits++;
  for (const c of q.canon) if (a.canon.has(c)) hits++;
  return { coverage: hits / total, terms };
}

/** The same answer given again for a different question. */
export function repeatsEarlier(answer: string, earlier: string[]): boolean {
  const t = answer.trim();
  if (compact(t).length < 20) return false;
  return earlier.some((e) => e && lexicalSimilarity(t, e) >= 0.8);
}
