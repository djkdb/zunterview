import type { Language } from "../../shared/schemas";

/** Candidate-facing interview copy in the interview's language. */
export const COPY = {
  ko: {
    lang: "ko",
    placeholder: "답변을 입력하거나, 녹음 버튼을 눌러 말로 답변하세요.",
    placeholderWaiting: "면접관의 질문을 듣고 있습니다…",
    timeAlmostUp: "시간이 거의 끝났습니다. 답변을 마무리해주세요.",
    timeUp: "답변 시간이 지났습니다. 정리해서 제출해주세요.",
    emptyAnswer: "답변을 입력하면 제출할 수 있어요.",
    textMode: "이 브라우저는 음성 입력을 지원하지 않아 텍스트 모드로 진행합니다.",
    recording: "듣고 있어요… 말씀이 끝나면 정지를 누르세요.",
    yourAnswer: "내 답변",
    pickingUp: "답변에서 이어서",
    followUp: "꼬리질문",
    nextQuestion: "다음 질문",
    stages: ["답변 제출", "AI 생각 중", "답변 분석 중"],
    whyFollowUp: "이 질문을 한 이유",
  },
  en: {
    lang: "en",
    placeholder: "Type your answer, or press record and speak.",
    placeholderWaiting: "Listening to the interviewer…",
    timeAlmostUp: "Time is almost up — start wrapping up.",
    timeUp: "Time's up. Wrap up and submit when ready.",
    emptyAnswer: "Write an answer to submit.",
    textMode: "Voice input isn't supported in this browser — using text mode.",
    recording: "Listening… press stop when you're done.",
    yourAnswer: "Your answer",
    pickingUp: "Picking up on",
    followUp: "Follow-up",
    nextQuestion: "Next question",
    stages: ["Answer submitted", "AI thinking", "Analyzing"],
    whyFollowUp: "Why this question",
  },
} satisfies Record<Language, unknown>;

export type Copy = (typeof COPY)["ko"];
