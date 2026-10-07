/**
 * Job posting check: for each requirement in the posting the candidate pasted, did any answer
 * show it with real experience? Runs in the browser on the finished interview; nothing is sent.
 */
import { josa } from "../../shared/korean";
import { extractMethods, extractTechs } from "../services/ai/mock/signals";

/**
 * Requirements stated in a job posting ("GA4 및 SQL 활용 능력", "B2B 영업 경험 우대")
 * → short phrases to verify ("GA4 및 SQL 활용", "B2B 영업").
 */
export function extractJdRequirements(jd: string): string[] {
  const out: string[] = [];
  for (const raw of jd.split(/\n|[•·▪■◦\-*]\s|[,;]|(?<=[.])\s/)) {
    const line = raw.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim();
    const m = line.match(/^(.{2,28}?)\s*(?:에\s?대한|관련|업무)?\s*(?:경험|능력|역량|지식|이해|활용\s?능력|가능자|가능|보유자|우대|자격증|숙련|역량 보유)/);
    if (!m) continue;
    const phrase = m[1].replace(/\s*(?:을|를|의|에|과|와|및)$/u, "").replace(/^(?:관련|유관)\s*/, "").trim();
    if (phrase.length >= 2 && phrase.length <= 24 && !/^(?:해당|관련|직무|업무|원활한|우수한|뛰어난)$/.test(phrase)) out.push(phrase);
  }
  // Named tools come first ("React와 TypeScript"): they're the most concrete thing to verify.
  const tools = [...extractTechs(jd), ...extractMethods(jd)].slice(0, 2);
  const toolPhrase = tools.length === 2 ? `${tools[0]}${josa(tools[0], "와/과")} ${tools[1]}` : (tools[0] ?? "");
  const rest = out.filter((o) => !tools.some((t) => o.includes(t)));
  return [...new Set([toolPhrase, ...rest].filter(Boolean))].slice(0, 4);
}

export type JdStatus = "shown" | "mentioned" | "missing";

export interface JdRequirement {
  text: string;
  /** "우대" lines are nice to have; the rest are what the posting asks for. */
  preferred: boolean;
}

export interface JdCheck extends JdRequirement {
  status: JdStatus;
  /** Sheet question number where it came up best. */
  questionNo?: number;
  quote?: string;
}

const PREFERRED_HEAD = /우대|preferred|nice to have|plus/i;
const REQUIRED_HEAD = /자격|필수|요건|requirement|qualification|담당\s?업무|주요\s?업무/i;

/** Requirements by section: lines under "[우대사항]" (or ending in "우대") are preferred. */
export function jdRequirements(jd: string): JdRequirement[] {
  const out: JdRequirement[] = [];
  let preferred = false;
  for (const line of jd.split(/\n+/)) {
    const head = /^\s*[[(【<]?\s*([^\])】>:]{1,12})[\])】>:]/.exec(line)?.[1] ?? (line.trim().length <= 12 ? line : "");
    if (head && PREFERRED_HEAD.test(head)) preferred = true;
    else if (head && REQUIRED_HEAD.test(head)) preferred = false;
    const body = line.replace(/^\s*[[(【<]?[^\])】>:]{1,12}[\])】>:]\s*/, "");
    for (const text of extractJdRequirements(body)) {
      if (out.some((r) => r.text === text)) continue;
      out.push({ text, preferred: preferred || /우대/.test(line.slice(line.indexOf(text.split(" ")[0]))) });
    }
  }
  return out.slice(0, 6);
}

const GENERIC = /^(?:활용|경험|능력|역량|이해|관련|업무|및|보유|가능|우대|지식|기반|대한|등)$/;

/** The words that have to appear in an answer: "GA4와 SQL" → ["GA4", "SQL"], "B2B 영업" → ["B2B", "영업"]. */
export function keyTerms(requirement: string): string[] {
  return requirement
    .split(/\s+|[와과및,/·]\s*(?=[A-Za-z가-힣])/)
    .map((w) => w.replace(/(?:을|를|의|에|으로|로|와|과)$/u, "").trim())
    .filter((w) => w.length >= 2 && !GENERIC.test(w));
}

const DONE = /(?:했|었|았|였|됐|봤|줬|냈|썼)(?:습니다|어요|고|는데|으며|지만)/;
const PLAN = /(?:겠습니다|싶습니다|배우|공부하|익히|못했|없습니다|안\s?해)/;
/** Present-tense description of one's own way of working: "~로 봅니다", "~를 확인합니다". */
const PRACTICE = /(?:합니다|봅니다|씁니다|맞춥니다|확인합니다|관리합니다|남깁니다|공유합니다|정리합니다)/;

export function checkJobPosting(jd: string, answers: { no: number; text: string }[]): JdCheck[] {
  return jdRequirements(jd).map((req) => {
    const terms = keyTerms(req.text);
    let best: JdCheck = { ...req, status: "missing" };
    for (const a of answers) {
      const sentences = a.text.split(/(?<=[.?!])\s+|\n+/);
      const hit = sentences.find((s) => terms.some((t) => s.toLowerCase().includes(t.toLowerCase())));
      if (!hit) continue;
      // Shown = told as something done, or as how they work now with specifics ("K-IFRS 1115호의 5단계로 봅니다");
      // mentioned = named, planned or still being studied.
      const shown = !PLAN.test(hit) && (DONE.test(hit) || (PRACTICE.test(hit) && (/\d/.test(hit) || hit.replace(/\s/g, "").length >= 30)));
      if (shown) return { ...req, status: "shown", questionNo: a.no, quote: hit.trim() };
      if (best.status === "missing") best = { ...req, status: "mentioned", questionNo: a.no, quote: hit.trim() };
    }
    return best;
  });
}

/** The check for a finished interview, numbered like the sheet's 문항별 평가. */
export function interviewJdChecks(i: { config: { jobDescription: string }; questions: { answer: string | null }[] }): JdCheck[] {
  if (!i.config.jobDescription?.trim()) return [];
  const answers = i.questions.flatMap((q, idx) => (q.answer ? [{ no: idx + 1, text: q.answer }] : []));
  return answers.length ? checkJobPosting(i.config.jobDescription, answers) : [];
}
