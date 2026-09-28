import type { InterviewConfig } from "../types/interview";

export const POSITION_PRESETS = [
  "Frontend Developer",
  "Backend Developer",
  "AI Engineer",
  "Product Manager",
  "Designer",
  "Marketing",
] as const;

export const QUESTION_LENGTHS = [5, 10, 15] as const;
export const ANSWER_TIME_OPTIONS = [
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 0, label: "Off" },
] as const;

export const DEFAULT_CONFIG: InterviewConfig = {
  position: "Frontend Developer",
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
export const DISCLAIMER = "AI-generated mock interview feedback. Scores are for practice purposes only.";
