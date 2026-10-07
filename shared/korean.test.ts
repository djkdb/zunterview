import { describe, expect, it } from "vitest";
import { josa } from "./korean";

describe("josa", () => {
  it("picks 을/를, 이/가, 은/는 after a consonant first", () => {
    expect(["인덱스", "결산", "SQL", "React"].map((w) => josa(w, "을/를"))).toEqual(["를", "을", "을", "를"]);
    expect(josa("지표", "이/가")).toBe("가");
    expect(josa("원인", "은/는")).toBe("은");
  });
  it("picks 와/과 the other way round (와 after a vowel)", () => {
    expect(["인덱스", "GA4", "React", "결산", "SQL", "Python"].map((w) => josa(w, "와/과"))).toEqual(["와", "와", "와", "과", "과", "과"]);
  });
});
