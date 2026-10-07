import { describe, expect, it } from "vitest";
import { EventSchema } from "../../shared/schemas";
import { DEFAULT_CONFIG } from "../config/options";
import { eventProps } from "./eventProps";

describe("interview events", () => {
  // The completion event once carried 9 fields against a limit of 8 and every one was rejected (TROUBLESHOOTING 22).
  it("fit the server's event schema, including the completion event", () => {
    const base = eventProps({ ...DEFAULT_CONFIG, position: "회계" });
    for (const props of [
      { ...base, mode: "mock" },
      { ...base, mode: "ai", answered: 7, score: 60 },
    ]) {
      expect(EventSchema.safeParse({ name: "interview_completed", props }).success).toBe(true);
    }
  });
});
