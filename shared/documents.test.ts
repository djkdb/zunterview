import { describe, expect, it } from "vitest";
import { documentClaims, documentQuestion, redactPersonalInfo } from "./documents";
import { unaskable } from "./questionRules";

const coverLetter = `저는 소프트웨어학부에서 웹 개발을 공부했습니다. 졸업 프로젝트로 캠퍼스 중고거래 앱을 팀장으로 개발하여 3개월 동안 사용자 1,200명을 모았습니다. 서버 응답이 느려지는 문제가 있었는데, 쿼리를 개선해 응답 시간을 40% 줄였습니다. 팀원 간 의견 차이가 있었을 때 매주 회고를 도입해 해결했습니다. 이 경험으로 사용자 피드백의 중요성을 배웠습니다. 귀사의 사용자 중심 문화에 공감하여 지원하게 되었습니다.`;
const resume = `학력: OO대학교 소프트웨어학부 졸업 (2025.02)
기술: React, TypeScript, Node.js, MySQL
프로젝트: 캠퍼스 중고거래 앱 (2024.03~2024.08) - 팀장, 백엔드 API 설계
자격증: 정보처리기사`;

describe("redactPersonalInfo", () => {
  it("masks contact details and ID numbers", () => {
    const t = redactPersonalInfo("연락처 010-1234-5678, hong@example.com, 900101-1234567, https://github.com/hong");
    expect(t).toBe("연락처 [전화번호], [이메일], [주민번호], [링크]");
  });
  it("keeps dates and metrics", () => {
    expect(redactPersonalInfo("2024.03~2024.08 응답 시간 40% 단축, 사용자 1,200명")).toBe("2024.03~2024.08 응답 시간 40% 단축, 사용자 1,200명");
  });
});

describe("documentClaims", () => {
  const claims = documentClaims({ resume, coverLetter });
  it("finds the claims an interviewer would ask about, numbers first", () => {
    expect(claims[0].kind).toBe("metric");
    const kinds = claims.map((c) => c.kind);
    for (const k of ["metric", "conflict", "project", "skill", "cert", "motivation", "learning"]) expect(kinds).toContain(k);
  });
  it("asks once per story: the problem and its number in one sentence are one question", () => {
    expect(claims.filter((c) => /응답/.test(c.quote)).map((c) => c.quote)).toEqual(["쿼리를 개선해 응답 시간을 40% 줄였습니다"]);
  });
  it("quotes the candidate's own words", () => {
    for (const c of claims) expect(`${resume}\n${coverLetter}`.replace(/\s+/g, "")).toContain(c.quote.replace(/\s+/g, ""));
  });
  it("writes a natural question that the room allows only with documents", () => {
    for (const c of claims) {
      const { question } = documentQuestion(c, "ko");
      expect(question).toMatch(/(?:이력서|자기소개서)/);
      expect(unaskable(question, 2, true)).toBe(false);
    }
    expect(unaskable("이력서에 적은 JWT 인증 방식을 설명해 주세요.", 2, false)).toBe(true);
    expect(documentQuestion({ kind: "skill", source: "resume", quote: "TypeScript" }, "ko").question).toBe("이력서에 TypeScript를 적어 주셨는데, 실제로 어떤 상황에서 어떻게 써 보셨나요?");
    expect(documentQuestion({ kind: "cert", source: "resume", quote: "정보처리기사" }, "ko").question).toContain("정보처리기사 자격증이");
  });
  it("is empty without documents", () => {
    expect(documentClaims({ resume: "", coverLetter: "" })).toEqual([]);
  });
});
