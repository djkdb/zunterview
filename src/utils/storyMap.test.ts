import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config/options";
import type { Interview, InterviewQuestion, QuestionType } from "../types/interview";
import { buildStoryMap, competencyOf, experienceOf, gapQuestion } from "./storyMap";

const fb = {} as NonNullable<InterviewQuestion["feedback"]>;
let n = 0;
const q = (text: string, type: QuestionType, answer: string, score: number, extra: Partial<InterviewQuestion> = {}): InterviewQuestion => ({
  id: `q${++n}`, text, type, isFollowUp: false, parentId: null, askedAt: n, answer, score, followUps: [], source: "mock", feedback: fb, ...extra,
});
const interview = (questions: InterviewQuestion[]): Interview => ({
  id: `i${n}`, createdAt: 0, config: { ...DEFAULT_CONFIG, position: "영업관리" }, questions, overallScore: 60, categoryScores: null, report: null, duration: 0, completed: true, endedEarly: false, providers: ["mock"],
});

describe("experienceOf", () => {
  it.each([
    ["졸업 프로젝트에서 백엔드를 맡았습니다.", "졸업 프로젝트"],
    ["편의점 아르바이트를 2년 했습니다.", "편의점 아르바이트"],
    ["동아리에서 회계를 맡았습니다.", "동아리"],
    ["팀 프로젝트로 중고거래 서비스를 만들었습니다.", "중고거래 서비스"],
    ["성실하게 일하겠습니다.", ""],
  ])("%s", (answer, name) => expect(experienceOf(answer)).toBe(name));
});

describe("competencyOf", () => {
  it("reads the kind from the question first, then its type", () => {
    expect(competencyOf("팀원과 갈등을 해결했던 경험을 말씀해 주세요.", "experience")).toBe("conflict");
    expect(competencyOf("가장 크게 실패했던 경험은 무엇인가요?", "experience")).toBe("failure");
    expect(competencyOf("엑셀로 어떻게 작업하시겠어요?", "role_specific")).toBe("role");
    expect(competencyOf("고객이 화를 낸다면 어떻게 하시겠어요?", "situational")).toBeNull();
  });
});

describe("buildStoryMap", () => {
  const map = buildStoryMap([
    interview([
      q("먼저 1분 동안 간단하게 자기소개 부탁드립니다.", "opening", "졸업 프로젝트에서 팀장을 맡았던 한지수입니다.", 70),
      q("팀원과 갈등을 해결했던 경험을 말씀해 주세요.", "experience", "졸업 프로젝트에서 일정 때문에 의견이 갈려 회의 방식을 바꿨습니다.", 64),
      q("가장 큰 성과를 낸 경험은 무엇인가요?", "result", "졸업 프로젝트에서 가입자를 1,200명 모았습니다.", 75),
      q("가장 어려웠던 점은 무엇이었나요?", "deep_dive", "서버가 자주 멈춰서 로그를 보며 고쳤습니다.", 55, { isFollowUp: true, parentId: `q${n}` }),
      q("영업관리 업무에 쓸 수 있는 역량은 무엇인가요?", "role_specific", "숫자를 꼼꼼하게 봅니다.", 48),
    ]),
  ]);

  it("groups answers by story, follow-ups under their main question's story", () => {
    expect(map.stories[0].name).toBe("졸업 프로젝트");
    expect(map.stories[0].uses).toHaveLength(4);
    expect(map.unnamed).toHaveLength(1);
  });

  it("finds the kinds never answered and the weak ones", () => {
    expect(map.missing).toEqual(["motivation", "failure", "leadership"]);
    expect(map.weak).toEqual(["role"]);
  });

  it("notices one story carrying everything", () => {
    expect(map.overused?.name).toBe("졸업 프로젝트");
  });

  it("offers a question for each gap", () => {
    expect(gapQuestion("motivation", "영업관리").text).toBe("영업관리 직무에 지원하신 이유를 말씀해 주세요.");
  });
});
