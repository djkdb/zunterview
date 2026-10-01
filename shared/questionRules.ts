/**
 * Questions this interview room can't support, whoever wrote them (the role bank, a company
 * bank or the AI): the panel has no résumé, portfolio, editor or whiteboard, the
 * self-introduction is asked once, and a question can't open with "이 기술…" pointing at
 * nothing that was said.
 */
export const NEEDS_MATERIAL =
  /(?:이력서|자기소개서|자소서|포트폴리오)에\s?(?:적|쓴|쓰신|적으신|기재)|라이브\s?코딩|화이트보드|코드를\s?(?:직접\s?)?(?:작성|짜)|손으로\s?(?:풀|그려)|^이\s?(?:부분|코드|화면|문제|기술|방법|서비스|구조|설계|프로젝트)(?:을|를|은|는|이|가|의)?\s|(?:on|in) your (?:resume|résumé|cv|cover letter|portfolio)|live[- ]?cod|whiteboard/i;

/** `askedSoFar`: questions already asked in this interview (a self-introduction is fine only first). */
export function unaskable(question: string, askedSoFar: number): boolean {
  return NEEDS_MATERIAL.test(question.trim()) || (askedSoFar > 0 && /자기\s?소개|introduce yourself/i.test(question));
}
