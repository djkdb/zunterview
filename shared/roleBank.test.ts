import { describe, expect, it } from "vitest";
import { MockAIProvider } from "../src/services/ai/MockAIProvider";
import type { AIConfig, InterviewContext, QuestionType } from "./schemas";
import { questionPool, retrieveQuestions, typesFor } from "./roleBank";
import { roleContextFor } from "./roles";
import { getCompany, COMPANIES, loadCompanyQuestions } from "./companies";

const ai = new MockAIProvider(false);

const config = (position: string, over: Partial<AIConfig> = {}): AIConfig => ({
  position,
  experience: "junior",
  interviewType: "mixed",
  difficulty: "normal",
  questionLimit: 10,
  jobDescription: "",
  persona: "professional",
  language: "ko",
  ...over,
});

/** Runs a full mock interview's main questions (no answers) and returns them. */
async function interview(c: AIConfig): Promise<{ question: string; type: QuestionType }[]> {
  const asked: string[] = [];
  const types: InterviewContext["usedTypes"] = [];
  const out: { question: string; type: QuestionType }[] = [];
  for (let i = 0; i < c.questionLimit; i++) {
    const q = await ai.generateQuestion({ config: c, progress: { asked: i, total: c.questionLimit }, history: [], askedQuestions: [...asked], usedTypes: [...types] });
    asked.push(q.question);
    types.push(q.type);
    out.push(q);
  }
  return out;
}

const DEV_TERMS = /React|API|Docker|Kubernetes|CI\/CD|TCP\/IP|코딩|프론트엔드|백엔드|서버/i;

describe("role question bank", () => {
  it.each([
    ["회계", /결산|재무제표|회계|계정|전표|마감|원가|세무|감사|숫자|현금/],
    ["간호사", /환자|간호|보호자|투약|병동|수혈|인수인계|감염|낙상/],
    ["퍼포먼스 마케팅", /캠페인|광고|전환|CTR|ROAS|채널|타깃|예산|키워드|소재|퍼널/],
    ["생산관리", /생산|납기|공정|재고|설비|품질|현장|라인|계획/],
  ])("%s gets its own job's questions, never a developer's", async (position, jobWords) => {
    const qs = await interview(config(position));
    for (const q of qs) expect(q.question).not.toMatch(DEV_TERMS);
    const onJob = qs.filter((q) => jobWords.test(q.question)).length;
    expect(onJob).toBeGreaterThanOrEqual(3);
    expect(new Set(qs.map((q) => q.question)).size).toBe(qs.length);
  });

  it("varies question types across an interview instead of repeating one", async () => {
    const qs = await interview(config("국내영업"));
    expect(new Set(qs.map((q) => q.type)).size).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < qs.length; i++) expect(qs[i].type === qs[i - 1].type && qs[i].type === qs[i - 2]?.type).toBe(false);
  });

  it("uses the bank for jobs typed freely", async () => {
    const qs = await interview(config("방송 기술감독"));
    expect(qs.filter((q) => /방송|촬영|편집|프로그램|제작|영상|송출|출연/.test(q.question)).length).toBeGreaterThanOrEqual(3);
    expect(qs.some((q) => /PD를|PD가/.test(q.question))).toBe(false);
  });

  it("filters by experience level", async () => {
    const ctx = roleContextFor({ position: "간호사" });
    const pool = await questionPool(ctx);
    const seniorOnly = pool.filter((q) => q.levels && !q.levels.includes("entry")).map((q) => q.text);
    const picked = await retrieveQuestions({ ctx, types: typesFor("leadership"), difficulty: "normal", experience: "entry", language: "ko", asked: [], limit: 5 });
    for (const c of picked.slice(0, 3)) expect(seniorOnly).not.toContain(c.q.text);
  });

  it("never repeats an already-asked question, even reworded", async () => {
    const ctx = roleContextFor({ position: "회계" });
    const first = await retrieveQuestions({ ctx, types: typesFor("role_specific"), difficulty: "normal", experience: "junior", language: "ko", asked: [], limit: 1 });
    const again = await retrieveQuestions({ ctx, types: typesFor("role_specific"), difficulty: "normal", experience: "junior", language: "ko", asked: [first[0].text], limit: 30 });
    expect(again.map((c) => c.text)).not.toContain(first[0].text);
  });

  it("verifies job-posting requirements against real experience", async () => {
    const qs = await interview(config("퍼포먼스 마케팅", { interviewType: "technical", jobDescription: "자격요건\n- GA4 및 SQL 활용 능력\n- 퍼포먼스 광고 운영 경험 우대" }));
    expect(qs.some((q) => q.question.includes("채용공고") && /GA4|SQL|퍼포먼스 광고/.test(q.question))).toBe(true);
  });
});

describe("company + role interviews", () => {
  it("mixes the company's questions with the role's", async () => {
    const hmc = getCompany("hyundai-motor") ?? COMPANIES[0];
    const qs = await interview(config("생산관리", { companyId: hmc.id }));
    const bank = await loadCompanyQuestions(hmc.id);
    const fromCompany = qs.filter((q) => bank.some((x) => x.text === q.question)).length;
    expect(fromCompany).toBeGreaterThanOrEqual(2);
    expect(qs.length - 1 - fromCompany).toBeGreaterThanOrEqual(3);
  });
});

describe("role-aware follow-ups and feedback", () => {
  const ctx = (position: string, difficulty: AIConfig["difficulty"] = "normal"): InterviewContext => ({
    config: config(position, { difficulty }),
    progress: { asked: 2, total: 10 },
    history: [],
    askedQuestions: [],
    usedTypes: ["opening", "motivation"],
  });

  it("marketing follow-ups move toward targets, channels and KPIs", async () => {
    const f = await ai.generateFollowUp(ctx("퍼포먼스 마케팅"), { question: "성과를 개선했던 경험을 말씀해 주세요.", type: "experience", isFollowUp: false, answer: "신규 고객 유입을 늘리기 위해 광고 소재를 새로 만들고 여러 번 테스트해서 운영했습니다." }, 0);
    expect(f.needed).toBe(true);
    expect(f.question).toMatch(/목표|타깃|채널|지표|KPI/);
  });

  it("accounting follow-ups ask about the standard behind a judgment", async () => {
    const f = await ai.generateFollowUp(ctx("회계"), { question: "숫자 오류를 바로잡은 경험이 있나요?", type: "experience", isFollowUp: false, answer: "월 마감 때 거래처 잔액이 장부와 달라서 담당자와 확인한 뒤 수정했습니다." }, 0);
    expect(f.needed).toBe(true);
    expect(f.question).toMatch(/결산|기준|순서|오류|재발/);
  });

  it("hard interviews push back in the field's own terms", async () => {
    const f = await ai.generateFollowUp(ctx("퍼포먼스 마케팅", "hard"), { question: "가장 성공한 캠페인을 말씀해 주세요.", type: "experience", isFollowUp: false, answer: "제가 기획한 리타겟팅 캠페인으로 ROAS를 180%에서 260%로 올렸고, 타깃을 재구매 고객으로 좁히고 소재를 교체했습니다." }, 0);
    expect(f.question).toMatch(/본인의 기여|증명|예산/);
  });

  it("adds a role-specific signal on top of the common scores", async () => {
    const a = await ai.analyzeAnswer(ctx("간호사"), { question: "환자 상태가 갑자기 나빠지면 어떻게 하시겠어요?", type: "situational", isFollowUp: false, answer: "먼저 활력징후를 확인하고 담당 의사에게 바로 보고한 뒤, 환자 안전을 위해 지시된 처치를 이중으로 확인하겠습니다." });
    expect(a.roleSignal?.label).toContain("환자 안전");
    expect(Object.keys(a.scores)).toHaveLength(6);
  });
});
