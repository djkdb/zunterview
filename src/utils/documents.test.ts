import { describe, expect, it } from "vitest";
import type { Interview } from "../types/interview";
import { DEFAULT_CONFIG } from "../config/options";
import { documentsLabel } from "./documents";
import { withoutDocuments } from "./storage";

const interview = (documents?: { resume: string; coverLetter: string }): Interview => ({
  id: "i1",
  createdAt: 0,
  config: { ...DEFAULT_CONFIG, position: "백엔드 개발자", documents },
  questions: [],
  overallScore: null,
  categoryScores: null,
  report: null,
  duration: 0,
  completed: true,
  endedEarly: false,
  providers: ["mock"],
});

describe("documents in history", () => {
  it("keeps which documents were used, never their text", () => {
    const saved = withoutDocuments(interview({ resume: "", coverLetter: "응답 시간을 40% 줄였습니다." }));
    expect(saved.config.documents).toBeUndefined();
    expect(JSON.stringify(saved)).not.toContain("40%");
    expect(saved.usedDocuments).toEqual(["coverLetter"]);
    expect(documentsLabel(saved)).toBe("자기소개서 기반");
  });
  it("labels an interview without documents", () => {
    expect(withoutDocuments(interview())).toEqual(interview());
    expect(documentsLabel(interview())).toBe("서류 없음 (직무 기반)");
  });
});
