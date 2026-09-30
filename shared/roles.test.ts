import { describe, expect, it } from "vitest";
import { DOMAINS, FAMILIES, ROLES, ROLE_STATS, domainOf, familyOf, resolveRole, roleContextFor, searchRoles } from "./roles";
import { isNearDuplicate } from "./similarity";
import { planComposition, planInterview } from "./blueprints";

describe("role taxonomy", () => {
  it("covers at least 150 roles across 51 domains, each with a family and a domain", () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(150);
    expect(DOMAINS.length).toBeGreaterThanOrEqual(51);
    for (const r of ROLES) {
      expect(FAMILIES.some((f) => f.id === r.family)).toBe(true);
      expect(domainOf(r)).toBeTruthy();
      expect(r.ko && r.en).toBeTruthy();
    }
  });

  it("has a question bank of at least 3,000 questions", () => {
    expect(ROLE_STATS.questions).toBeGreaterThanOrEqual(3000);
  });
});

describe("role matching", () => {
  const roleOf = (q: string) => resolveRole(q).role?.id ?? null;

  it.each([
    ["회계", "accountant"],
    ["간호사", "nurse"],
    ["간호", "nurse"],
    ["반도체 공정", "semi_process"],
    ["반도체 공정 엔지니어", "semi_process"],
    ["데이터 애널", "data_analyst"],
    ["HRD", "hrd"],
    ["BM", "brand_marketer"],
    ["FE", "frontend"],
    ["프론트엔드 개발자", "frontend"],
    ["Frontend Developer", "frontend"],
    ["브랜드 마케팅", "brand_marketer"],
    ["퍼포먼스 마케팅", "performance_marketer"],
  ])("%s → %s", (input, id) => {
    expect(roleOf(input)).toBe(id);
  });

  it("maps a broad word to its area and asks which job is closest", () => {
    const m = resolveRole("마케팅");
    expect(m.broad).toBe(true);
    expect(m.domain?.id).toBe("marketing");
    const office = resolveRole("사무직");
    expect(office.broad).toBe(true);
    expect(office.suggestions.map((r) => r.id)).toEqual(expect.arrayContaining(["hr_planner", "accountant", "general_affairs"]));
  });

  it("never sends a free-typed job to a generic bucket when there's something to go on", () => {
    const tech = roleContextFor({ position: "방송 기술감독" });
    expect(tech.domain?.id).toBe("broadcast");
    expect(tech.archetype).toBe("media_content");
    const car = resolveRole("자동차 영업");
    expect(car.role?.id ?? car.suggestions[0]?.id).toBe("auto_sales");
  });

  it("searches across aliases and families (개발 → developers, 회계 → accounting)", () => {
    const dev = searchRoles("개발", 12).map((m) => m.role.id);
    expect(dev).toEqual(expect.arrayContaining(["frontend", "backend", "fullstack"]));
    const acc = searchRoles("회계", 8).map((m) => familyOf(m.role).domain);
    expect(acc.filter((d) => d === "accounting").length).toBeGreaterThanOrEqual(3);
  });
});

describe("interview blueprint", () => {
  it("opens with a self-introduction and motivation, and ends with reflection", () => {
    const plan = planInterview({ archetype: "marketing_growth", interviewType: "mixed", experience: "junior", questionLimit: 10 });
    expect(plan).toHaveLength(10);
    expect(plan.slice(0, 2)).toEqual(["opening", "motivation"]);
    expect(plan[9]).toBe("reflection");
    // No long runs of the same type.
    for (let i = 1; i < plan.length; i++) expect(plan[i]).not.toBe(plan[i - 1]);
  });

  it("does not force technical questions on non-technical jobs", () => {
    for (const archetype of ["finance_accounting", "clinical_care", "marketing_growth", "sales_customer", "hr_people"] as const) {
      const plan = planInterview({ archetype, interviewType: "technical", experience: "junior", questionLimit: 15 });
      expect(plan).not.toContain("technical");
    }
    expect(planInterview({ archetype: "tech_dev", interviewType: "technical", experience: "junior", questionLimit: 10 })).toContain("technical");
  });

  it("describes the question mix in percent", () => {
    const mix = planComposition(planInterview({ archetype: "finance_accounting", interviewType: "mixed", experience: "entry", questionLimit: 10 }));
    expect(mix.reduce((s, m) => s + m.pct, 0)).toBe(100);
    expect(mix[0].bucket).toBe("job");
  });
});

describe("semantic duplicate detection", () => {
  it("treats rewordings of the same question as duplicates", () => {
    expect(isNearDuplicate("팀원과 갈등이 생겼던 경험을 말해주세요.", "팀 동료와 의견 충돌이 있었던 사례를 설명해주세요.")).toBe(true);
    expect(isNearDuplicate("상사가 부당한 지시를 한다면 어떻게 하시겠어요?", "상사의 부당한 지시를 받았다면 어떻게 대응하시겠습니까?")).toBe(true);
  });

  it("keeps questions that only look alike", () => {
    expect(isNearDuplicate("본인의 강점은 무엇인가요?", "본인의 약점은 무엇인가요?")).toBe(false);
    expect(isNearDuplicate("고객 불만을 해결한 경험을 말씀해 주세요.", "고객 불만이 반복된다면 어떻게 하시겠어요?")).toBe(false);
  });
});
