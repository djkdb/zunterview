/**
 * Question fingerprinting to stop the interviewer from repeating itself.
 * Character bigrams work for both Korean (no reliable word boundaries) and English.
 */
const STRIP = /[\s"'“”‘’`.,!?…·:;()[\]{}\-_/]+/g;

export function bigrams(text: string): Set<string> {
  const s = text.toLowerCase().replace(STRIP, "");
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

export function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export const DUPLICATE_THRESHOLD = 0.6;

export function isDuplicateQuestion(candidate: string, asked: string[]): boolean {
  return asked.some((q) => similarity(candidate, q) >= DUPLICATE_THRESHOLD);
}
