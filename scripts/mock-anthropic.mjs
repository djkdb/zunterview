// Stand-in for the Anthropic Messages API (POST /v1/messages), for running the app or the
// prompt evaluation without a key and for reproducing failures on purpose.
//
//   MODE=ok      plain, schema-shaped answers (default)
//   MODE=tells   the same, but worded like a chatbot (dashes, "핵심", "!"), to show the checks catch it
//   MODE=badjson text that isn't JSON          → the app falls back to the mock interviewer
//   MODE=slow    answers after SLOW_MS (40 s)   → timeouts
//   MODE=refusal stop_reason "refusal"
//
//   node scripts/mock-anthropic.mjs            # http://localhost:9911
//   ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://localhost:9911 npm run dev
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 9911);
const MODE = process.env.MODE ?? "ok";
const SLOW_MS = Number(process.env.SLOW_MS ?? 40_000);
const tells = MODE === "tells";

const star = (status) => ({ status, note: status === "present" ? "답변에서 확인됨" : "답변에 없음" });
const scores = (base) => Object.fromEntries(["relevance", "logic", "specificity", "structure", "communication", "confidence"].map((k, i) => [k, { score: base + (i % 3) * 2, reason: "답변에 근거한 이유" }]));

const BODIES = {
  question: { question: tells ? "좋습니다! 핵심 경험 하나를 말씀해 주세요 — 가장 어려웠던 것으로요." : "최근에 맡았던 일 가운데 가장 어려웠던 것을 말씀해 주세요.", type: "experience", intent: "경험 확인" },
  followup: { needed: true, question: tells ? "단순히 운영한 게 아니라, 어떤 성과가 있었나요?" : "그 캠페인은 어떤 지표로 성공을 판단했나요?", type: "result", reason: "결과가 빠져 있습니다.", anchor: "신규 고객 유입 캠페인" },
  analyze: {
    quality: "adequate",
    scores: scores(62),
    star: { applicable: true, situation: star("present"), task: star("partial"), action: star("present"), result: star("missing") },
    strength: tells ? "핵심이 돋보였습니다!" : "상황과 한 일을 순서대로 말했습니다.",
    improve: "결과를 수치로 말해 보세요.",
    betterAnswer: { problem: "결과가 없음", suggestion: "수치 추가", example: "결산을 [이전]일에서 [이후]일로 줄였습니다." },
    evidence: ["마감 체크리스트를 만들고"],
    notFound: ["성과 수치"],
    reaction: tells ? "좋습니다 — 인상적인 답변이네요!" : "네, 잘 들었습니다.",
    roleSignal: null,
  },
  report: { headline: "기본기는 갖춘 면접", topFeedback: "결과를 수치로 말하세요.", strengths: ["순서대로 말함"], improvements: ["수치 부족"], nextSteps: ["대표 경험 3개의 전후 수치 정리"], closingRemark: "수고하셨습니다." },
  role: { title: "연습용 직무", domain: "strategy", family: "기획", archetype: "general", skills: ["문제 정의"], topics: ["업무 이해"] },
};

function kindOf(system) {
  if (system.includes("next main interview question")) return "question";
  if (system.includes("follow-up question on the same topic")) return "followup";
  if (system.includes("evaluate one answer")) return "analyze";
  if (system.includes("final") || system.includes("report")) return "report";
  return "role";
}

let calls = 0;
createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const system = Array.isArray(body.system) ? body.system.map((b) => b.text).join("") : String(body.system ?? "");
    const kind = kindOf(system);
    calls++;
    console.log(`#${calls} ${kind} mode=${MODE} model=${body.model} cache_control=${Array.isArray(body.system) && body.system.some((b) => b.cache_control)}`);
    const reply = () => {
      const text = MODE === "badjson" ? "{not json" : JSON.stringify(BODIES[kind]);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: `msg_mock_${calls}`,
          type: "message",
          role: "assistant",
          model: body.model,
          content: [{ type: "text", text }],
          stop_reason: MODE === "refusal" ? "refusal" : "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 900, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        }),
      );
    };
    if (MODE === "slow") setTimeout(reply, SLOW_MS);
    else reply();
  });
}).listen(PORT, () => console.log(`mock Anthropic API on http://localhost:${PORT} (MODE=${MODE})`));
