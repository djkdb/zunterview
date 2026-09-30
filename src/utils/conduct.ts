/**
 * When the candidate swears at or insults the panel, the chair ends the
 * interview on the spot — what would happen in a real one.
 */
import type { FinalReport, Language } from "../../shared/schemas";

export function conductLine(lang: Language): string {
  return lang === "ko"
    ? "지금 그 발언은 면접 자리에서 용납할 수 없습니다. 오늘 면접은 여기서 종료하겠습니다."
    : "That language is not acceptable in an interview. We'll end the interview here.";
}

export function conductReport(lang: Language): Pick<FinalReport, "headline" | "topFeedback" | "closingRemark"> {
  return lang === "ko"
    ? {
        headline: "면접 중 부적절한 발언으로 면접위원장이 면접을 중단했습니다.",
        topFeedback: "실제 면접에서 욕설이나 무례한 표현은 답변 내용과 상관없이 그 자리에서 탈락 사유가 됩니다. 답하기 어려운 질문에는 '잘 모르겠습니다'나 '잠시 생각해도 될까요?'라고 말해 보세요.",
        closingRemark: "면접은 서로에 대한 예의에서 시작합니다. 다음 연습에서는 끝까지 함께해 주세요.",
      }
    : {
        headline: "The panel chair ended the interview because of inappropriate language.",
        topFeedback: "In a real interview, swearing or insults end your chances on the spot, whatever your answers. If a question is hard, say you're not sure or ask for a moment.",
        closingRemark: "An interview starts with mutual respect. Stay with it to the end next time.",
      };
}
