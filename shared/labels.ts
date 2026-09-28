/** Human-readable labels shared by prompts (server) and UI (client). */
import type { CategoryKey, Difficulty, ExperienceLevel, InterviewType, Persona, QuestionType } from "./schemas";

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  entry: "Entry",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
};

export const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  hr: "HR",
  technical: "Technical",
  project: "Project",
  behavioral: "Behavioral",
  mixed: "Mixed",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export const PERSONA_LABEL: Record<Persona, string> = {
  professional: "Professional",
  friendly: "Friendly",
  strict: "Strict",
  technical: "Technical",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  opening: "Opening",
  deep_dive: "Deep Dive",
  technical: "Technical",
  challenge: "Challenge",
  reflection: "Reflection",
  result: "Result",
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  relevance: "Relevance",
  logic: "Logic",
  specificity: "Specificity",
  structure: "Structure",
  communication: "Communication",
  confidence: "Confidence",
};
