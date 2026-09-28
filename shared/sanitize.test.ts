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
