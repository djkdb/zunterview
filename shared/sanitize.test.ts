import { describe, expect, it } from "vitest";
import { isGroundedQuote, sanitizeFollowUp } from "./sanitize";

describe("hallucination guard", () => {
  it("accepts verbatim quotes and rejects invented ones", () => {
    const answer = "팀 프로젝트에서 성능 문제를 해결했습니다.";
    expect(isGroundedQuote("성능 문제를 해결했습니다", answer)).toBe(true);
    expect(isGroundedQuote("Redis caching을 적용", answer)).toBe(false);
  });

  it("drops an anchor that is not in the answer", () => {
    const f = sanitizeFollowUp({ needed: true, question: "Q?", type: "deep_dive", reason: "r", anchor: "Redis" }, "로그를 봤습니다");
    expect(f.anchor).toBe("");
  });
});

import { sanitizeQuestion } from "./sanitize";
describe("tidy", () => {
  it("drops the dashes models reach for", () => {
    expect(sanitizeQuestion({ question: "결산 일정 — 특히 마감 직전 — 은 어떻게 관리하셨나요?", type: "experience", intent: "x" }).question).toBe("결산 일정, 특히 마감 직전은 어떻게 관리하셨나요?");
    expect(sanitizeQuestion({ question: "좋습니다 — 다음 질문입니다.", type: "experience", intent: "x" }).question).toBe("좋습니다, 다음 질문입니다.");
  });
});
