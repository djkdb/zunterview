/** The evaluation sheet's numbered parts. Optional parts appear only when the interview has them, numbered in order. */
export type SheetPart = "summary" | "categories" | "opinion" | "documents" | "jobPosting" | "habits" | "questions";

export const SHEET_TITLE: Record<SheetPart, string> = {
  summary: "종합 평가",
  categories: "항목별 평가",
  opinion: "면접위원 종합 의견",
  documents: "서류와 답변 비교",
  jobPosting: "공고 요건 확인",
  habits: "말버릇 점검",
  questions: "문항별 평가",
};

export function sheetParts(has: { opinion: boolean; documents: boolean; jobPosting: boolean; habits: boolean }): SheetPart[] {
  return [
    "summary",
    "categories",
    ...(has.opinion ? (["opinion"] as const) : []),
    ...(has.documents ? (["documents"] as const) : []),
    ...(has.jobPosting ? (["jobPosting"] as const) : []),
    ...(has.habits ? (["habits"] as const) : []),
    "questions",
  ];
}

export const sheetNo = (parts: SheetPart[], part: SheetPart) => parts.indexOf(part) + 1;
