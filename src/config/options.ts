import type { InterviewConfig } from "../types/interview";

export const POSITION_PRESETS = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "AI 엔지니어",
  "서비스 기획자 (PM)",
  "UX/UI 디자이너",
  "마케터",
] as const;

export const QUESTION_LENGTHS = [5, 10, 15] as const;
export const ANSWER_TIME_OPTIONS = [
  { value: 60, label: "1분" },
  { value: 120, label: "2분" },
  { value: 180, label: "3분" },
  { value: 0, label: "제한 없음" },
] as const;

export const DEFAULT_CONFIG: InterviewConfig = {
  position: "프론트엔드 개발자",
  experience: "junior",
  interviewType: "mixed",
  difficulty: "normal",
  questionLimit: 5,
  jobDescription: "",
  persona: "professional",
  language: "ko",
  answerTimeLimit: 120,
  voiceEnabled: true,
  liveFeedback: true,
};

export const INTERVIEWER_NAME = "ALEX";
export const DISCLAIMER = "AI가 생성한 모의면접 피드백입니다. 점수는 연습용 참고 지표이며 실제 채용 평가가 아닙니다.";
