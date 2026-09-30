import { describe, expect, it } from "vitest";
import type { AIConfig, InterviewContext } from "../../shared/schemas";
import { questionPrompt } from "./questionPrompt";
import { followUpPrompt } from "./followupPrompt";
import { analysisPrompt } from "./analysisPrompt";

const ctx = (position: string, over: Partial<AIConfig> = {}): InterviewContext => ({
  config: { position, experience: "junior", interviewType: "mixed", difficulty: "normal", questionLimit: 10, jobDescription: "", persona: "professional", language: "ko", ...over },
  progress: { asked: 3, total: 10, followUps: 1 },
  history: [],
  askedQuestions: ["먼저 1분 동안 간단하게 자기소개 부탁드립니다."],
  usedTypes: ["opening", "motivation", "role_specific"],
});

describe("AI prompts carry the role profile and blueprint", () => {
  it("gives the question generator the accountant's profile, plan and bank — not generic questions", async () => {
    const { system, user } = await questionPrompt(ctx("회계", { roleId: "accountant" }));
    expect(user).toContain("The job — 회계(재무회계)");
    expect(user).toMatch(/Core skills: .*(결산|재무제표)/);
    expect(user).toContain("Interview blueprint");
    expect(user).toContain("Role question bank");
    expect(system).toMatch(/recommends a \*\*\w+\*\* question now/);
    // Only a filtered handful of candidates, never the whole bank.
    expect((user.match(/^- \[/gm) ?? []).length).toBeLessThanOrEqual(40);
    expect(user).not.toMatch(/React|Docker|Kubernetes/);
  });

  it("describes an inferred practice profile for a job outside the taxonomy", async () => {
    const { user } = await questionPrompt(ctx("반도체 장비 셋업 엔지니어", { customRole: { title: "반도체 장비 셋업 엔지니어", domain: "electronics", family: "반도체", archetype: "manufacturing_quality", skills: ["장비 셋업", "공정 이해"], topics: ["장비 인터락", "수율"] } }));
    expect(user).toContain("practice profile inferred");
    expect(user).toContain("장비 셋업");
  });

  it("combines company and role material in company mode", async () => {
    const { user } = await questionPrompt(ctx("생산관리", { companyId: "hyundai-motor" }));
    expect(user).toContain("Company interview mode — 현대자동차");
    expect(user).toContain("The job — 생산관리");
  });

  it("steers follow-ups along the field's path and asks analysis for the role signal", async () => {
    const turn = { question: "캠페인 경험을 말씀해 주세요.", type: "experience" as const, isFollowUp: false, answer: "신규 고객 유입 캠페인을 운영했습니다." };
    const f = await followUpPrompt(ctx("퍼포먼스 마케팅", { difficulty: "hard" }), turn, 0);
    expect(f.system).toMatch(/goal .*→ target .*→ channel .*→ kpi/);
    expect(f.system).toContain("본인의 기여");
    const a = await analysisPrompt(ctx("간호사"), turn);
    expect(a.system).toContain("환자 안전");
  });
});
