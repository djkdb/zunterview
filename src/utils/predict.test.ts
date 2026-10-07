import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config/options";
import type { Interview, InterviewQuestion } from "../types/interview";
import { predictedFollowUps } from "./predict";

const fb = {} as NonNullable<InterviewQuestion["feedback"]>;
const q = (id: string, text: string, answer: string, extra: Partial<InterviewQuestion> = {}): InterviewQuestion => ({
  id, text, type: "experience", isFollowUp: false, parentId: null, askedAt: 0, answer, score: 60, followUps: [], source: "mock", feedback: fb, ...extra,
});

describe("predicted follow-ups", () => {
  const interview: Interview = {
    id: "i", createdAt: 0, config: { ...DEFAULT_CONFIG, position: "백엔드 개발자" }, overallScore: 60, categoryScores: null, report: null, duration: 0, completed: true, endedEarly: false, providers: ["mock"],
    questions: [
      q("a", "가장 어려웠던 프로젝트 경험을 말씀해 주세요.", "주문 조회 API가 느려서 슬로우 쿼리 로그를 확인했고, 복합 인덱스를 추가해 응답 시간을 40% 줄였습니다. 이후 캐시도 도입했습니다."),
      q("b", "말씀하신 '40%'는 어떻게 측정하거나 확인하셨나요?", "배포 전후 일주일 평균 응답 시간을 APM으로 비교했습니다.", { isFollowUp: true, parentId: "a" }),
    ],
  };
  const p = predictedFollowUps(interview);

  it("lists follow-ups the answer could still get, without the one that was asked", () => {
    expect(p.a?.length).toBeGreaterThan(0);
    expect(p.a?.length).toBeLessThanOrEqual(3);
    expect(p.a?.some((x) => x.question.includes("측정하거나 확인"))).toBe(false);
    expect(p.a?.every((x) => x.question && x.reason)).toBe(true);
  });

  it("skips non-answers", () => {
    const none = predictedFollowUps({ ...interview, questions: [q("x", "강점이 무엇인가요?", "모르겠습니다.")] });
    expect(none.x).toBeUndefined();
  });
});
