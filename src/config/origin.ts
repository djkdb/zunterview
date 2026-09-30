import type { QuestionOrigin } from "../types/interview";

/**
 * How a question's source is shown. Never "기출" — these are practice questions
 * reconstructed from public material, or written from the role's typical work.
 */
export const ORIGIN_LABEL: Record<QuestionOrigin, { label: string; title: string }> = {
  후기: { label: "공개후기 기반", title: "공개된 면접 후기에 보고된 질문을 연습용으로 재구성했습니다." },
  공개후기: { label: "공개후기 기반", title: "공개된 면접 후기에 보고된 질문을 연습용으로 재구성했습니다." },
  공식자료: { label: "공식자료 기반", title: "인재상·직무기술서·NCS 등 공식 자료에서 도출한 연습 질문입니다." },
  공고기반: { label: "공고기반", title: "공개 채용공고의 요건에서 도출한 연습 질문입니다." },
  직무기반: { label: "직무기반", title: "직무의 일반적인 업무를 바탕으로 만든 연습 질문입니다. 실제 기출이 아닙니다." },
};
