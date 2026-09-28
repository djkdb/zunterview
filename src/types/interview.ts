import type {
  AIConfig,
  AnswerAnalysis,
  CategoryKey,
  FinalReport,
  QuestionType,
} from "../../shared/schemas";

export type { AIConfig, AnswerAnalysis, CategoryKey, FinalReport, QuestionType };

export interface InterviewConfig extends AIConfig {
  /** Seconds per answer; 0 = no limit. */
  answerTimeLimit: number;
  voiceEnabled: boolean;
  /** Show per-answer scores in the Interview Notes during the interview. */
  liveFeedback: boolean;
}

export type ProviderKind = "ai" | "mock";

export interface InterviewQuestion {
  id: string;
  text: string;
  type: QuestionType;
  isFollowUp: boolean;
  /** Main question this follow-up belongs to (null for main questions). */
  parentId: string | null;
  /** Why the interviewer asked this follow-up / question. */
  followUpReason?: string;
  /** Verbatim phrase from the previous answer the follow-up picks up. */
  anchor?: string;
  /** Spoken lead-in before the question (reaction to the previous answer). */
  reaction?: string;
  askedAt: number;
  answer: string | null;
  answerMode?: "text" | "voice";
  answerDurationSec?: number;
  feedback: AnswerAnalysis | null;
  score: number | null;
  /** IDs of follow-up questions asked on this question. */
  followUps: string[];
  source: ProviderKind;
  /** Matches a researched company question: reported by candidates, or derived from official values. */
  origin?: "후기" | "공식자료";
}

export type CategoryScores = Record<CategoryKey, number>;

export interface Interview {
  id: string;
  createdAt: number;
  config: InterviewConfig;
  questions: InterviewQuestion[];
  overallScore: number | null;
  categoryScores: CategoryScores | null;
  report: FinalReport | null;
  /** Seconds. */
  duration: number;
  completed: boolean;
  endedEarly: boolean;
  providers: ProviderKind[];
}

/** Compact record persisted to localStorage for the history list. */
export interface InterviewSummary {
  id: string;
  createdAt: number;
  position: string;
  interviewType: InterviewConfig["interviewType"];
  score: number;
  duration: number;
  questionCount: number;
  strongest: CategoryKey | null;
  company?: string;
}
