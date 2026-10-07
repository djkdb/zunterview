import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiBlocked, budgetExhausted, metrics, recordAi, recordEvent, recordTts, resetUsage, today, ttsBlocked } from "./usage";

beforeEach(() => {
  vi.stubEnv("DATA_DIR", "/tmp/zunterview-usage-test");
  resetUsage();
});
afterEach(() => vi.unstubAllEnvs());

describe("usage limits", () => {
  it("stops AI calls for the whole service once the day's budget is spent", () => {
    vi.stubEnv("AI_DAILY_BUDGET_USD", "0.5");
    recordAi("1.1.1.1", true, 30);
    expect(budgetExhausted()).toBe(false);
    recordAi("2.2.2.2", true, 25);
    expect(budgetExhausted()).toBe(true);
    expect(aiBlocked("3.3.3.3")).toBe("budget");
  });

  it("gives each visitor a daily share", () => {
    vi.stubEnv("AI_CALLS_PER_IP_PER_DAY", "2");
    recordAi("1.1.1.1", true, 0);
    recordAi("1.1.1.1", false, 0);
    expect(aiBlocked("1.1.1.1")).toBe("quota");
    expect(aiBlocked("9.9.9.9")).toBeNull();
  });

  it("limits neural voice per visitor, counting only new audio toward the bill", async () => {
    vi.stubEnv("TTS_CHARS_PER_IP_PER_DAY", "100");
    recordTts("1.1.1.1", 60, false);
    recordTts("1.1.1.1", 30, true);
    expect(ttsBlocked("1.1.1.1", 20)).toBe(true);
    expect(ttsBlocked("2.2.2.2", 20)).toBe(false);
    const [day] = await metrics(1);
    expect(day).toMatchObject({ day: today(), ttsChars: 60, ttsCalls: 1, visitors: 2 });
  });

  it("counts events and feedback votes without visitor data", async () => {
    await recordEvent("interview_completed", { mode: "mock" });
    await recordEvent("feedback", { rating: 1 });
    await recordEvent("feedback", { rating: -1, comment: "질문이 너무 쉬웠어요" });
    const [day] = await metrics(1);
    expect(day.events).toEqual({ interview_completed: 1, feedback: 2 });
    expect(day.feedback).toEqual({ up: 1, down: 1 });
  });

  it("counts returning visits on top of all visits", async () => {
    await recordEvent("landing_viewed", { returning: false });
    await recordEvent("landing_viewed", { returning: true });
    const [day] = await metrics(1);
    expect(day.events).toMatchObject({ landing_viewed: 2, landing_returning: 1 });
  });
});
