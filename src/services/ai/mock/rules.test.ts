import { describe, expect, it } from "vitest";
import { pickMetric, readSignals } from "./signals";
import { assertive, capFor, CAP, noStory, withoutFillers, conclusionFirst, exampleFromAnswer, groundedReaction, improveFromAnswer, plannedInsteadOfDone, ro, splitLong } from "./rules";

const sig = (answer: string, question = "가장 어려웠던 경험을 말씀해 주세요.") => readSignals(answer, question, "ko");

describe("assertive: a hedged sentence said plainly", () => {
  it.each([
    ["저는 꼼꼼한 편인 것 같습니다.", "저는 꼼꼼한 편입니다."],
    ["제가 일정을 정리했던 것 같습니다.", "제가 일정을 정리했습니다."],
    ["영업이 저에게 맞는 것 같아요.", "영업이 저에게 맞습니다."],
    ["사람 만나는 걸 좋아하는 것 같습니다.", "사람 만나는 걸 좋아합니다."],
    ["그 방법이 가장 좋은 것 같습니다.", "그 방법이 가장 좋습니다."],
    ["팀에 도움이 되는 것 같습니다.", "팀에 도움이 됩니다."],
  ])("%s", (input, out) => expect(assertive(input)).toBe(out));

  it("leaves an ending it can't rewrite in the right tense", () => {
    expect(assertive("제가 정리한 것 같습니다.")).toBeNull();
    expect(assertive("결과를 받은 것 같습니다.")).toBeNull();
    expect(assertive("열심히 했습니다.")).toBeNull();
  });
});

describe("splitLong and ro", () => {
  it("splits a long past-tense sentence at its connective", () => {
    expect(splitLong("슬로우 쿼리 로그로 원인을 찾았고, 인덱스를 추가해 응답 시간을 줄였습니다.")).toBe("슬로우 쿼리 로그로 원인을 찾았습니다. 인덱스를 추가해 응답 시간을 줄였습니다.");
    expect(splitLong("기업 30곳에 제안서를 보냈고, 매주 회신율을 정리해 문구를 바꿨습니다.")).toBe("기업 30곳에 제안서를 보냈습니다. 매주 회신율을 정리해 문구를 바꿨습니다.");
    expect(splitLong("처음에는 일정이 촉박했지만 우선순위를 다시 정해 마감을 지켰습니다.")).toBe("처음에는 일정이 촉박했습니다. 하지만 우선순위를 다시 정해 마감을 지켰습니다.");
  });
  it("picks 으로/로", () => {
    expect(["인덱스", "A/B 테스트", "회귀 분석", "메일", "SQL", "3"].map(ro)).toEqual(["로", "로", "으로", "로", "로", "으로"]);
  });
});

describe("reading the answer", () => {
  it("notices background-first and conclusion-first answers", () => {
    expect(conclusionFirst(sig("대학교 3학년 때 학회에서 처음으로 데이터 분석 프로젝트를 맡게 되었습니다. 당시 팀원은 네 명이었습니다. 저는 설문 데이터를 정리하고 회귀 분석을 했습니다. 결과를 학회에서 발표했습니다."))).toBe("late");
    expect(conclusionFirst(sig("결론부터 말씀드리면 조회 API 응답을 1.2초에서 0.7초로 줄였습니다. 슬로우 쿼리 로그로 원인을 찾았습니다. 정렬 컬럼에 인덱스를 추가했습니다. 그 뒤로 같은 문의가 없었습니다."))).toBe("first");
    expect(conclusionFirst(sig("짧은 답입니다."))).toBeNull();
  });

  it("tells an experience question answered with plans", () => {
    expect(plannedInsteadOfDone("갈등을 해결했던 경험을 말씀해 주세요.", "저라면 먼저 상대 의견을 듣고 합의점을 찾겠습니다.")).toBe(true);
    expect(plannedInsteadOfDone("갈등을 해결했던 경험을 말씀해 주세요.", "동아리에서 회의 방식을 바꿔 의견 차이를 좁혔습니다.")).toBe(false);
    expect(plannedInsteadOfDone("팀원이 반대한다면 어떻게 하시겠어요?", "먼저 이유를 듣겠습니다.")).toBe(false);
  });
});

describe("answers without a story", () => {
  it("tells attitudes from plans and from stories", () => {
    const q = "성과를 냈던 캠페인 경험을 말씀해 주세요.";
    expect(noStory(q, "저는 항상 고객 입장에서 생각하려고 노력합니다. 어떤 일이든 책임감을 가지고 끝까지 해내는 편입니다.")).toBe(true);
    expect(noStory(q, "신규 가입 캠페인의 전환율을 2.1%에서 3.4%로 올렸습니다.")).toBe(false);
    expect(plannedInsteadOfDone(q, "저는 항상 고객 입장에서 생각하려고 노력합니다.")).toBe(false);
  });
  it("drops filler words from a rewritten sentence", () => {
    expect(withoutFillers("약간 사람 만나는 걸 좋아합니다.")).toBe("사람 만나는 걸 좋아합니다.");
    expect(withoutFillers("음 그냥 좀 더 확인했습니다.")).toBe("좀 더 확인했습니다.");
  });
});

describe("calibration (the AI prompt's score bands)", () => {
  it("caps generic answers, plans and resolutions", () => {
    expect(capFor(sig("저는 항상 책임감을 가지고 맡은 일을 끝까지 하려고 노력하는 사람입니다. 어떤 일이든 성실하게 임합니다."), { platitude: false, plannedOnly: false })).toBe(CAP.generic);
    expect(capFor(sig("열심히 하겠습니다."), { platitude: true, plannedOnly: false })).toBe(CAP.platitude);
    expect(capFor(sig("응답 시간을 40% 줄였습니다."), { platitude: false, plannedOnly: false })).toBe(100);
  });
});

describe("feedback in the candidate's own words", () => {
  const answer = "저는 주문 조회 API를 맡아 쿼리를 개선했습니다. 팀원들과 매일 진행 상황을 공유했습니다. 사용자 문의가 줄었습니다.";
  it("builds the example from the candidate's sentence and leaves placeholders for what's missing", () => {
    const ex = exampleFromAnswer("specificity", sig(answer))!;
    expect(ex).toContain("저는 주문 조회 API를 맡아 쿼리를 개선했습니다");
    expect(ex).toContain("[이전 수치]");
  });
  it("quotes the sentence the improvement is about", () => {
    expect(improveFromAnswer("specificity", sig(answer), { late: false, plannedOnly: false })).toContain("‘저는 주문 조회 API를 맡아 쿼리를 개선했습니다’");
    const hedged = sig("동아리에서 의견을 정리하는 역할을 했던 것 같습니다. 다들 만족했던 것 같습니다.");
    expect(improveFromAnswer("confidence", hedged, { late: false, plannedOnly: false })).toContain("끝을 흐리면");
    expect(exampleFromAnswer("confidence", hedged)).toBe("“동아리에서 의견을 정리하는 역할을 했습니다.”");
  });
  it("acknowledges the concrete thing said, but not every time", () => {
    const s = sig("결제 페이지 이탈률을 A/B 테스트로 확인해 32%에서 21%로 낮췄습니다.");
    const lines = [1, 2, 3, 4, 5, 6].map((seed) => groundedReaction("strong", s, seed));
    expect(lines.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    expect(lines).toContain(null);
    expect(lines.filter(Boolean).every((l) => !/것 같|!/.test(l!))).toBe(true);
  });
});

describe("pickMetric", () => {
  it("prefers a result to a period and keeps the whole unit", () => {
    expect(pickMetric("출시 후 3개월 동안 학생 1,200명이 가입했습니다.")).toBe("1,200명");
    expect(pickMetric("3개월 동안 진행했습니다.")).toBe("3개월");
    expect(pickMetric("응답 시간을 1.2초에서 0.7초로 줄였습니다.")).toBe("1.2초");
    expect(pickMetric("협찬 420만 원을 받았습니다.")).toBe("420만 원");
  });
});
