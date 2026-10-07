/**
 * Speaking habits across one interview's answers: the hedged endings ("~것 같습니다"),
 * filler words ("약간", "그냥", "음"), polite-casual endings ("~했어요") and answers that ran
 * very short or very long. Runs in the browser on the answers already on screen; nothing is sent.
 */

export interface HabitAnswer {
  /** Question number on the sheet (1-based). */
  no: number;
  text: string;
}

export interface HabitHit {
  /** What the candidate says, as shown on the sheet: "~것 같습니다", "약간". */
  label: string;
  count: number;
  questionNos: number[];
  /** One sentence where it came up, for the sheet to quote. */
  sample: { questionNo: number; sentence: string };
}

export interface SpeechHabits {
  answers: number;
  hedges: HabitHit | null;
  /** "~요" endings where an interview answer usually ends in "~습니다". */
  casualEndings: HabitHit | null;
  /** Most frequent first. Only words used two or more times. */
  fillers: HabitHit[];
  short: number[];
  long: number[];
}

/** Characters without spaces: a rough length that doesn't depend on spacing habits. */
const size = (s: string) => s.replace(/\s/g, "").length;
export const SHORT_ANSWER = 40;
export const LONG_ANSWER = 450;

const HEDGE = /것\s?같(?:습니다|아요|았습니다|았어요|다고|은데|네요|고요|다|아서|기도)|(?:않았나|아닌가|않나)\s?싶(?:습니다|어요|다)/g;

/** Exact tokens (after trimming punctuation). "좀 더" is left alone; "그" is a determiner, not a filler. */
const FILLERS: Record<string, string> = {
  음: "음",
  어: "어",
  으음: "음",
  약간: "약간",
  뭔가: "뭔가",
  그냥: "그냥",
  좀: "좀",
  되게: "되게",
  진짜: "진짜",
  막: "막",
  이제: "이제",
  사실: "사실",
  사실은: "사실",
};

const sentences = (text: string) =>
  text
    .split(/(?<=[.?!。])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const CASUAL_END = /요[.?!~…]*$/;
// Words that end in 요, and greetings ("안녕하세요"), which are polite as they are.
const NOT_CASUAL = /(?:필요|중요|수요|주요|요요|안녕하세요)[.?!~…]*$/;

function tokenOf(raw: string): string {
  const t = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (/^음+$/.test(t)) return "음";
  if (/^어+$/.test(t)) return "어";
  return t;
}

class Tally {
  private hits = new Map<string, HabitHit>();
  add(label: string, questionNo: number, sentence: string) {
    const h = this.hits.get(label);
    if (h) {
      h.count++;
      if (!h.questionNos.includes(questionNo)) h.questionNos.push(questionNo);
    } else {
      this.hits.set(label, { label, count: 1, questionNos: [questionNo], sample: { questionNo, sentence } });
    }
  }
  get(label: string): HabitHit | null {
    return this.hits.get(label) ?? null;
  }
  all(): HabitHit[] {
    return [...this.hits.values()];
  }
}

export function speechHabits(answers: HabitAnswer[]): SpeechHabits {
  const hedges = new Tally();
  const casual = new Tally();
  const fillers = new Tally();
  const short: number[] = [];
  const long: number[] = [];

  for (const a of answers) {
    const text = a.text.trim();
    if (!text) continue;
    const n = size(text);
    if (n < SHORT_ANSWER) short.push(a.no);
    if (n > LONG_ANSWER) long.push(a.no);

    for (const s of sentences(text)) {
      for (let k = (s.match(HEDGE) ?? []).length; k > 0; k--) hedges.add("~것 같습니다", a.no, s);
      if (CASUAL_END.test(s) && !NOT_CASUAL.test(s)) casual.add("~요", a.no, s);
      const tokens = s.split(/\s+/).map(tokenOf);
      tokens.forEach((t, i) => {
        const label = FILLERS[t];
        if (!label) return;
        if (t === "좀" && tokens[i + 1]?.startsWith("더")) return;
        fillers.add(label, a.no, s);
      });
    }
  }

  return {
    answers: answers.filter((a) => a.text.trim()).length,
    hedges: hedges.get("~것 같습니다"),
    casualEndings: casual.get("~요"),
    fillers: fillers
      .all()
      .filter((h) => h.count >= 2)
      .sort((a, b) => b.count - a.count),
    short,
    long,
  };
}

/** Where a habit sits in a sample sentence, for highlighting. */
export function habitPattern(label: string): RegExp {
  if (label === "~것 같습니다") return new RegExp(HEDGE.source, "g");
  if (label === "~요") return /\S*요(?=[.?!~…]*$)/g;
  const words = Object.entries(FILLERS)
    .filter(([, l]) => l === label)
    .map(([w]) => (w === "음" ? "음+" : w === "어" ? "어+" : w));
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join("|")})(?![\\p{L}\\p{N}])`, "gu");
}

/** Nothing worth pointing out: at most one hedge, no repeated filler, no casual endings, no odd lengths. */
export function habitsClean(h: SpeechHabits): boolean {
  return (h.hedges?.count ?? 0) <= 1 && !h.casualEndings && h.fillers.length === 0 && h.short.length === 0 && h.long.length === 0;
}
