import { describe, expect, it } from "vitest";
import { chatbotTells } from "./voice";

describe("chatbotTells", () => {
  it("finds the chatbot habits", () => {
    expect(chatbotTells("좋습니다 — 핵심이 잘 전달됐습니다!")).toEqual(["줄표", "느낌표", "상투어"]);
    expect(chatbotTells("단순히 기술을 쓴 것이 아니라 문제를 정의했습니다.")).toEqual(["단순히 ~가 아니라"]);
  });
  it("leaves a plain interviewer line alone", () => {
    expect(chatbotTells("네, 알겠습니다. 수치까지 말씀해 주셔서 이해가 됩니다.")).toEqual([]);
  });
});
