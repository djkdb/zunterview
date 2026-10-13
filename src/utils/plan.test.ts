import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config/options";
import type { Interview } from "../types/interview";
import { buildPlan, dayKey, daysBetween, type InterviewPlan, type PracticeState } from "./plan";

const at = (day: string, h = 10) => new Date(`${day}T${String(h).padStart(2, "0")}:00:00`).getTime();
const plan: InterviewPlan = { date: "2026-10-17", company: "삼성전자", position: "백엔드 개발자", createdAt: 0 };
const empty: PracticeState = { interviews: [], intros: [], scripts: [], weakQuestions: 3, gapKinds: 2 };
const interview = (day: string, preset = false): Interview => ({
  id: day, createdAt: at(day), config: { ...DEFAULT_CONFIG, position: "백엔드 개발자", ...(preset ? { preset: [{ text: "q", type: "experience" as const }] } : {}) },
  questions: [], overallScore: 60, categoryScores: null, report: null, duration: 0, completed: true, endedEarly: false, providers: ["mock"],
});

describe("면접 준비 플랜", () => {
  it("counts days in local dates", () => {
    expect(daysBetween("2026-10-13", "2026-10-17")).toBe(4);
    expect(dayKey(at("2026-10-13", 23))).toBe("2026-10-13");
  });

  it("plans every day up to the interview, rehearsal the day before and review on the day", () => {
    const days = buildPlan(plan, empty, "2026-10-13");
    expect(days.map((d) => d.dLeft)).toEqual([4, 3, 2, 1, 0]);
    expect(days[0].tasks.map((t) => t.kind)).toEqual(["intro", "full"]);
    expect(days[1].tasks.map((t) => t.kind)).toEqual(["weak", "gaps"]);
    expect(days[3].tasks.map((t) => t.kind)).toEqual(["rehearsal", "intro"]);
    expect(days[4].tasks.map((t) => t.kind)).toEqual(["review"]);
  });

  it("ticks off today's tasks from what was actually done today", () => {
    const s: PracticeState = { ...empty, interviews: [interview("2026-10-13"), interview("2026-10-12")], intros: [{ at: at("2026-10-12"), text: "", seconds: 60, score: 72, position: "" }] };
    const [today] = buildPlan(plan, s, "2026-10-13");
    expect(today.tasks.find((t) => t.kind === "full")?.done).toBe(true);
    expect(today.tasks.find((t) => t.kind === "intro")?.done).toBe(false);
    expect(today.tasks.find((t) => t.kind === "intro")?.detail).toContain("72점");
  });

  it("counts a notebook interview as practising weak questions, not as a full interview", () => {
    const s: PracticeState = { ...empty, interviews: [interview("2026-10-14", true)] };
    const days = buildPlan(plan, s, "2026-10-14");
    expect(days[0].tasks.find((t) => t.kind === "full")?.done).toBe(false);
    const tomorrowStyle = buildPlan({ ...plan, date: "2026-10-18" }, s, "2026-10-13")[1];
    expect(tomorrowStyle.tasks.find((t) => t.kind === "weak")?.done).toBe(false); // the future isn't ticked
  });

  it("returns nothing once the date has passed", () => {
    expect(buildPlan(plan, empty, "2026-10-18")).toEqual([]);
  });
});
