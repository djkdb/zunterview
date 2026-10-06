import { describe, expect, it } from "vitest";
import { checkDocuments, quantities, type CheckTurn } from "./documentCheck";
import { documentClaims, documentQuestion } from "./documents";

const docs = {
  coverLetter: "졸업 프로젝트로 캠퍼스 중고거래 앱을 팀장으로 개발하여 3개월 동안 사용자 1,200명을 모았습니다. 서버 응답이 느려지는 문제가 있었는데, 쿼리를 개선해 응답 시간을 40% 줄였습니다.",
  resume: "프로젝트: 캠퍼스 중고거래 앱 (2024.03~2024.08) - 팀장",
};
const ask = (needle: RegExp) => documentQuestion(documentClaims(docs).find((c) => needle.test(c.quote))!, "ko").question;
const turn = (no: number, thread: number, question: string, answer: string, score = 70): CheckTurn => ({ no, thread, question, answer, score });

describe("quantities", () => {
  it("reads numbers with units", () => {
    expect(quantities("사용자 1,200명, 응답 시간 40% 단축, 1.2초에서 0.7초로").map((q) => q.text)).toEqual(["1,200명", "40%", "1.2초", "0.7초"]);
  });
});

describe("checkDocuments", () => {
  it("flags a different number for the same claim", () => {
    const rows = checkDocuments(docs, [turn(2, 1, ask(/1,200명/), "가입자는 800명 정도였고 홍보는 팀원이 맡았습니다.")]);
    expect(rows[0]).toMatchObject({ status: "mismatch", questionNo: 2 });
    expect(rows[0].detail).toBe("서류에는 1,200명인데 답변에서는 800명이라고 했습니다. 어느 쪽이 맞는지 정리해 두세요.");
  });

  it("accepts a percentage explained as a before/after", () => {
    const rows = checkDocuments(docs, [turn(3, 2, ask(/40%/), "평균 1.2초 걸리던 목록 API를 인덱스로 0.7초까지 줄였습니다.")]);
    expect(rows[0].status).toBe("match");
    expect(rows[0].detail).toContain("42%");
  });

  it("says when the number on paper was never explained", () => {
    const rows = checkDocuments(docs, [turn(3, 2, ask(/40%/), "쿼리를 고쳐서 빨라졌습니다.")]);
    expect(rows[0].status).toBe("unexplained");
  });

  it("notices a leader on paper who was a helper in the interview", () => {
    const rows = checkDocuments(docs, [turn(4, 3, ask(/캠퍼스 중고거래 앱$/), "저는 팀원으로 참여해서 API 일부를 도왔습니다.")]);
    expect(rows[0].status).toBe("mismatch");
  });

  it("judges only claims the interview got to", () => {
    expect(checkDocuments(docs, [turn(1, 0, "먼저 자기소개 부탁드립니다.", "소프트웨어학부를 졸업했습니다.")])).toEqual([]);
  });
});

describe("checkDocuments wording", () => {
  it("names the result, not the duration, when a number goes unexplained", () => {
    const rows = checkDocuments(docs, [turn(7, 4, ask(/1,200명/), "회원 테이블 기준으로 집계했고 가입 흐름은 제가 맡았습니다.")]);
    expect(rows[0].detail).toMatch(/^서류에 쓴 1,200명을 답변에서/);
  });
});
