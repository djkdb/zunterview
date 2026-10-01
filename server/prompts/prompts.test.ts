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
    expect(user).toMatch(/recommended next type is \*\*\w+\*\*/);
    expect(system).toContain("blueprint");
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

describe("prompts stay cacheable and carry the room rules", () => {
  it("keeps the question and follow-up system prompts identical from turn to turn", async () => {
    const a = await questionPrompt({ ...ctx("백엔드 개발자", { roleId: "backend" }), progress: { asked: 1, total: 10, followUps: 0 }, usedTypes: ["opening"] });
    const b = await questionPrompt({ ...ctx("백엔드 개발자", { roleId: "backend" }), progress: { asked: 4, total: 10, followUps: 2 }, usedTypes: ["opening", "motivation", "technical", "situational"] });
    expect(a.system).toBe(b.system);
    expect(a.user).not.toBe(b.user);
    const turn = { question: "동시성 문제를 해결한 경험을 말씀해 주세요.", type: "experience" as const, isFollowUp: false, answer: "예약 API에 비관적 락을 적용했습니다." };
    const f0 = await followUpPrompt(ctx("백엔드 개발자"), turn, 0);
    const f1 = await followUpPrompt(ctx("백엔드 개발자"), turn, 1);
    expect(f0.system).toBe(f1.system);
    expect(f1.user).toContain("depth on this question: 1");
  });

  it("tells the model what the room can't do and how to treat plans and repeats", async () => {
    const turn = { question: "강점은 무엇인가요?", type: "reflection" as const, isFollowUp: false, answer: "끈기입니다." };
    const q = await questionPrompt(ctx("회계"));
    expect(q.system).toContain("이력서에 적은");
    const f = await followUpPrompt(ctx("회계"), turn, 0);
    expect(f.system).toMatch(/plan, a wish or a hypothetical/);
    const history = [{ question: "자기소개 부탁드립니다.", type: "opening" as const, isFollowUp: false, answer: "결산을 6년 담당했습니다." }];
    const a = await analysisPrompt({ ...ctx("회계"), history }, turn);
    expect(a.user).toContain("<earlier_answer");
    expect(a.system).toContain("repeats one of the earlier answers");
  });
});

describe("document-based interviews", () => {
  const documents = { resume: "기술: React, TypeScript", coverLetter: "쿼리를 개선해 응답 시간을 40% 줄였습니다." };
  it("puts the documents in the cached system prompt and lets the panel cite them", async () => {
    const q = await questionPrompt(ctx("프론트엔드 개발자", { documents }));
    expect(q.system).toContain("<cover_letter>\n쿼리를 개선해 응답 시간을 40% 줄였습니다.\n</cover_letter>");
    expect(q.system).not.toContain("never refer to \"이력서에 적은");
    expect(q.user).toContain("Document-based questions so far");
    const a = await analysisPrompt(ctx("프론트엔드 개발자", { documents }), { question: "q", type: "experience", isFollowUp: false, answer: "a" });
    expect(a.system).toContain("<resume>");
  });
  it("keeps the no-document room unchanged", async () => {
    const q = await questionPrompt(ctx("프론트엔드 개발자", { documents: { resume: " ", coverLetter: "" } }));
    expect(q.system).not.toContain("submitted documents");
    expect(q.system).toContain("이력서에 적은");
    expect(q.user).not.toContain("Document-based");
  });
});
