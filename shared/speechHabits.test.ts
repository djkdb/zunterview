import { describe, expect, it } from "vitest";
import { habitsClean, speechHabits } from "./speechHabits";

describe("speechHabits", () => {
  it("counts hedged endings across answers and keeps a sample sentence", () => {
    const h = speechHabits([
      { no: 1, text: "저는 꼼꼼한 편인 것 같습니다. 그래서 결산 업무가 맞는 것 같습니다." },
      { no: 2, text: "팀에 도움이 되지 않았나 싶습니다." },
    ]);
    expect(h.hedges?.count).toBe(3);
    expect(h.hedges?.questionNos).toEqual([1, 2]);
    expect(h.hedges?.sample).toEqual({ questionNo: 1, sentence: "저는 꼼꼼한 편인 것 같습니다." });
  });

  it("finds repeated filler words but leaves '좀 더' and the determiner '그' alone", () => {
    const h = speechHabits([
      { no: 1, text: "음… 약간 어려웠는데 그냥 해 봤습니다. 그 결과 좀 더 빨라졌습니다." },
      { no: 2, text: "약간 긴장했지만 음 그냥 끝까지 했습니다." },
    ]);
    expect(h.fillers.map((f) => [f.label, f.count])).toEqual([
      ["음", 2],
      ["약간", 2],
      ["그냥", 2],
    ]);
  });

  it("drops a filler used only once", () => {
    expect(speechHabits([{ no: 1, text: "사실 처음 해 보는 일이었습니다." }]).fillers).toEqual([]);
  });

  it("flags casual '~요' endings but not words that merely end in 요", () => {
    const h = speechHabits([
      { no: 1, text: "그때 제가 직접 고쳤어요. 확인 절차가 중요." },
      { no: 2, text: "결과는 두 배였거든요." },
      { no: 3, text: "안녕하세요. 지원자 김민수입니다." },
    ]);
    expect(h.casualEndings?.count).toBe(2);
    expect(h.casualEndings?.questionNos).toEqual([1, 2]);
  });

  it("marks very short and very long answers", () => {
    const h = speechHabits([
      { no: 1, text: "열심히 하겠습니다." },
      { no: 2, text: "가".repeat(460) },
      { no: 3, text: "결산 체크리스트를 만들어 월 결산을 7영업일에서 5영업일로 줄였습니다. 부서별 제출 기한을 앞당겼습니다." },
    ]);
    expect(h.short).toEqual([1]);
    expect(h.long).toEqual([2]);
  });

  it("calls a plain interview answer clean", () => {
    const h = speechHabits([
      { no: 1, text: "결산 체크리스트를 만들어 월 결산을 7영업일에서 5영업일로 줄였습니다. 부서별 제출 기한을 D-3으로 바꾼 것이 컸습니다." },
    ]);
    expect(habitsClean(h)).toBe(true);
    expect(h.answers).toBe(1);
  });
});
