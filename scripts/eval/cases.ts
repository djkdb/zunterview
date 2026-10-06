/**
 * Fixed interview situations for measuring the AI prompts. Each case says what a good
 * interviewer would do and how to check it automatically. The situations come from the
 * failures found in persona simulations (docs/TROUBLESHOOTING.md), so a prompt change can be
 * judged by whether those failures come back.
 */
import type { AIConfig, AnswerAnalysis, CurrentTurn, FollowUpDecision, GeneratedQuestion, InterviewContext, Turn } from "../../shared/schemas";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { unaskable } from "../../shared/questionRules";
import { isNearDuplicate } from "../../shared/similarity";
import { isGroundedQuote } from "../../shared/sanitize";
import { chatbotTells } from "../../shared/voice";

const config = (position: string, over: Partial<AIConfig> = {}): AIConfig => ({
  position, experience: "entry", interviewType: "mixed", difficulty: "normal", questionLimit: 5, jobDescription: "", persona: "professional", language: "ko", ...over,
});
const ctx = (cfg: AIConfig, history: Turn[] = [], asked: string[] = [], over: Partial<InterviewContext> = {}): InterviewContext => ({
  config: cfg,
  progress: { asked: Math.max(asked.length, history.filter((h) => !h.isFollowUp).length), total: cfg.questionLimit, followUps: history.filter((h) => h.isFollowUp).length },
  history,
  askedQuestions: asked.length ? asked : history.map((h) => h.question),
  usedTypes: history.map((h) => h.type),
  ...over,
});
const OPENING = "먼저 1분 동안 간단하게 자기소개 부탁드립니다.";
const turn = (question: string, answer: string, type: Turn["type"] = "experience", isFollowUp = false): Turn => ({ question, type, isFollowUp, answer });

/** One automatic check: a name and either null (passed) or why it failed. */
export type Check = [name: string, problem: string | null];
const check = (name: string, ok: boolean, problem: string): Check => [name, ok ? null : problem];
const plain = (name: string, ...texts: string[]): Check => {
  const found = [...new Set(texts.flatMap(chatbotTells))];
  return check(name, !found.length, `챗봇 말투: ${found.join(", ")}`);
};
const avg = (a: AnswerAnalysis) => Math.round(CATEGORY_KEYS.reduce((s, k) => s + a.scores[k].score, 0) / CATEGORY_KEYS.length);

export type EvalCase =
  | { id: string; title: string; kind: "question"; context: InterviewContext; checks: (out: GeneratedQuestion) => Check[] }
  | { id: string; title: string; kind: "followup"; context: InterviewContext; turn: CurrentTurn; depth: number; checks: (out: FollowUpDecision) => Check[] }
  | { id: string; title: string; kind: "analyze"; context: InterviewContext; turn: CurrentTurn; checks: (out: AnswerAnalysis) => Check[] };

const DEV_WORDS = /React|API|서버|코드|프론트|백엔드|데이터베이스|SQL|배포/;

const nurseIntro = turn(OPENING, "간호학과를 졸업했습니다. 내과 병동 실습에서 낙상 고위험 환자 체크리스트를 인수인계에 넣자고 제안했습니다.", "opening");
const accountantIntro = turn(OPENING, "제조업 재무팀에서 4년간 월 결산을 맡았습니다. 마감 체크리스트를 만들어 결산을 7영업일에서 5영업일로 줄였습니다.", "opening");
const docs = {
  coverLetter: "졸업 프로젝트로 캠퍼스 중고거래 앱을 팀장으로 개발하여 3개월 동안 사용자 1,200명을 모았습니다. 쿼리를 개선해 응답 시간을 40% 줄였습니다.",
  resume: "기술: Java, Spring Boot, MySQL, Redis\n프로젝트: 캠퍼스 중고거래 앱 (2024.03~2024.08) - 팀장",
};

export const CASES: EvalCase[] = [
  {
    id: "q-nurse-role",
    title: "간호사 지원자에게 간호 질문을 하는가 (다른 직무 질문 금지)",
    kind: "question",
    context: ctx(config("간호사", { roleId: "nurse" }), [nurseIntro]),
    checks: (o) => [
      check("직무 이탈 없음", !DEV_WORDS.test(o.question), `개발 용어가 섞임: ${o.question}`),
      check("면접실에서 가능한 질문", !unaskable(o.question, 1), `불가능한 질문: ${o.question}`),
      check("자기소개 반복 없음", !isNearDuplicate(o.question, OPENING), "자기소개를 다시 요구"),
      check("말로 하기 좋은 길이", o.question.length <= 90, `${o.question.length}자로 김`),
      plain("사람 같은 말투", o.question),
    ],
  },
  {
    id: "q-no-resume",
    title: "서류를 받지 않았는데 이력서를 언급하지 않는가",
    kind: "question",
    context: ctx(config("회계", { roleId: "accountant", experience: "junior" }), [accountantIntro]),
    checks: (o) => [
      check("이력서·화이트보드 언급 없음", !unaskable(o.question, 1, false), `불가능한 질문: ${o.question}`),
      check("반복 없음", !isNearDuplicate(o.question, OPENING), "앞 질문 반복"),
      plain("사람 같은 말투", o.question),
    ],
  },
  {
    id: "q-documents",
    title: "서류 기반 면접에서 서류의 주장을 인용해 묻는가",
    kind: "question",
    context: ctx(config("백엔드 개발자", { roleId: "backend", documents: docs }), [turn(OPENING, "소프트웨어학부를 졸업했고 중고거래 앱 백엔드를 맡았습니다.", "opening")]),
    checks: (o) => [
      check("서류 언급", /자기소개서|이력서|서류|1,200|40%|팀장|Redis/.test(o.question), `서류와 무관한 질문: ${o.question}`),
      check("가능한 질문(서류 허용)", !unaskable(o.question, 1, true), `불가능한 질문: ${o.question}`),
      plain("사람 같은 말투", o.question),
    ],
  },
  {
    id: "f-plan-not-experience",
    title: "계획·바람을 경험처럼 되묻지 않는가",
    kind: "followup",
    context: ctx(config("백엔드 개발자", { roleId: "backend" }), [turn(OPENING, "웹 개발을 공부한 신입입니다.", "opening")]),
    turn: { question: "입사하면 어떤 개발자가 되고 싶나요?", type: "reflection", isFollowUp: false, answer: "장애나 버그가 생겼을 때 원인을 끝까지 찾아서 서비스 안정성에 기여하고 싶습니다." },
    depth: 0,
    checks: (o) => [
      check("과거 경험처럼 묻지 않음", !(o.needed && /(?:어떻게|무엇을)\s?(?:해결|파악|찾)(?:하셨|했)|원인은 무엇이었/.test(o.question)), `계획을 경험처럼 되물음: ${o.question}`),
      plain("사람 같은 말투", o.question, o.reason),
    ],
  },
  {
    id: "f-resolution",
    title: "다짐만 한 답에는 꼬리질문하지 않는가",
    kind: "followup",
    context: ctx(config("회계", { roleId: "accountant" }), [accountantIntro]),
    turn: { question: "입사 후 포부를 말씀해 주세요.", type: "reflection", isFollowUp: false, answer: "열심히 하겠습니다. 최선을 다하겠습니다." },
    depth: 0,
    checks: (o) => [check("꼬리질문 안 함", !o.needed, `다짐에 꼬리질문: ${o.question}`)],
  },
  {
    id: "f-story-missing-result",
    title: "결과가 빠진 경험 이야기에 근거를 짚어 되묻는가",
    kind: "followup",
    context: ctx(config("퍼포먼스 마케터", { experience: "junior" }), [turn(OPENING, "퍼포먼스 마케터로 2년 일했습니다.", "opening")]),
    turn: { question: "가장 기억에 남는 캠페인을 말씀해 주세요.", type: "experience", isFollowUp: false, answer: "신규 고객 유입 캠페인을 3개월 동안 운영했습니다. 타깃을 20대 대학생으로 좁히고 인스타그램 광고 소재를 매주 바꿨습니다." },
    depth: 0,
    checks: (o) => [
      check("꼬리질문 함", o.needed, "결과가 빠졌는데 넘어감"),
      check("답변 속 표현 인용", !o.needed || (o.anchor !== "" && isGroundedQuote(o.anchor, "신규 고객 유입 캠페인을 3개월 동안 운영했습니다. 타깃을 20대 대학생으로 좁히고 인스타그램 광고 소재를 매주 바꿨습니다.")), `anchor가 답변에 없음: ${o.anchor}`),
      check("다른 뜻으로 오해 없음", !/성능|속도|장애/.test(o.question), `'퍼포먼스'를 성능으로 오해: ${o.question}`),
      plain("사람 같은 말투", o.question, o.reason),
    ],
  },
  {
    id: "a-resolution",
    title: "다짐만 한 답을 낮게 채점하는가",
    kind: "analyze",
    context: ctx(config("회계", { roleId: "accountant" }), [accountantIntro]),
    turn: { question: "입사 후 포부를 말씀해 주세요.", type: "reflection", isFollowUp: false, answer: "열심히 하겠습니다. 최선을 다하겠습니다." },
    checks: (o) => [
      check("평균 30점 미만", avg(o) < 30, `평균 ${avg(o)}점으로 후함`),
      check("강점을 지어내지 않음", !/구체|사례|수치|논리/.test(o.strength), `없는 강점: ${o.strength}`),
      plain("사람 같은 말투", o.reaction, o.strength, o.improve),
    ],
  },
  {
    id: "a-off-topic",
    title: "질문과 다른 답의 질문 이해도를 40점 이하로 주는가",
    kind: "analyze",
    context: ctx(config("간호사", { roleId: "nurse" }), [nurseIntro]),
    turn: { question: "격리와 역격리는 대상과 목적이 어떻게 다른지 설명해 주세요.", type: "role_specific", isFollowUp: false, answer: "저는 환자 안전을 가장 먼저 생각하는 간호사가 되고 싶습니다. 실습 때 선배님들께 많이 배웠습니다." },
    checks: (o) => [check("질문 이해도 40 이하", o.scores.relevance.score <= 40, `질문 이해도 ${o.scores.relevance.score}점`), plain("사람 같은 말투", o.reaction, o.improve)],
  },
  {
    id: "a-strong",
    title: "좋은 답에 근거 있는 높은 점수와 실제 인용을 주는가",
    kind: "analyze",
    context: ctx(config("회계", { roleId: "accountant", experience: "junior" }), [accountantIntro]),
    turn: {
      question: "결산 일정을 줄인 경험을 말씀해 주세요.",
      type: "experience",
      isFollowUp: false,
      answer: "월 결산이 7영업일 걸려 보고가 늦었습니다. 원인을 보니 부서별 자료가 늦게 들어왔습니다. 제가 마감 체크리스트를 만들고 제출 기한을 D-3으로 당겼고, 늦는 부서에는 전날 알림을 보냈습니다. 그 결과 결산이 5영업일로 줄었고 6개월 동안 유지됐습니다.",
    },
    checks: (o) => [
      check("평균 70점 이상", avg(o) >= 70, `평균 ${avg(o)}점으로 박함`),
      check("인용이 모두 답변에 있음", o.evidence.every((e) => isGroundedQuote(e, "월 결산이 7영업일 걸려 보고가 늦었습니다. 원인을 보니 부서별 자료가 늦게 들어왔습니다. 제가 마감 체크리스트를 만들고 제출 기한을 D-3으로 당겼고, 늦는 부서에는 전날 알림을 보냈습니다. 그 결과 결산이 5영업일로 줄었고 6개월 동안 유지됐습니다.")), `지어낸 인용: ${o.evidence.join(" / ")}`),
      plain("사람 같은 말투", o.reaction, o.strength, o.improve),
    ],
  },
];
