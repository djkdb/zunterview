import type {
  AnswerAnalysis,
  CurrentTurn,
  FinalReport,
  FollowUpDecision,
  GeneratedQuestion,
  InterviewContext,
  ReportRequest,
  Usage,
} from "../../../shared/schemas";
import type { ProviderKind } from "../../types/interview";

/**
 * Everything the interview needs from "the AI". Swap implementations to change
 * model/vendor without touching UI or interview logic.
 */
export interface AIProvider {
  readonly kind: ProviderKind;
  readonly label: string;
  generateQuestion(ctx: InterviewContext): Promise<GeneratedQuestion>;
  generateFollowUp(ctx: InterviewContext, turn: CurrentTurn, depth: number): Promise<FollowUpDecision>;
  analyzeAnswer(ctx: InterviewContext, turn: CurrentTurn): Promise<AnswerAnalysis>;
  generateFinalReport(req: ReportRequest): Promise<FinalReport>;
}

export type AIErrorKind = "network" | "timeout" | "server" | "parse" | "unavailable" | "refusal" | "rate_limited" | "injected";

export class AIRequestError extends Error {
  constructor(
    public readonly kind: AIErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

export type UsageListener = (usage: Usage) => void;
