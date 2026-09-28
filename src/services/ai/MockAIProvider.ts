/**
 * MOCK MODE interviewer. Runs entirely in the browser with no API key.
 * It still behaves like an interviewer: it reads the answer, picks up the
 * candidate's own words for follow-ups, and grounds every score in the text.
 */
import {
  CATEGORY_KEYS,
  type AnswerAnalysis,
  type AnswerQuality,
  type CategoryKey,
  type CurrentTurn,
  type FinalReport,
  type FollowUpDecision,
  type GeneratedQuestion,
  type InterviewContext,
  type Language,
  type QuestionType,
  type ReportRequest,
  type StarPart,
} from "../../../shared/schemas";
import { clampScore, sanitizeAnalysis, sanitizeFollowUp } from "../../../shared/sanitize";
import { CATEGORY_LABEL } from "../../../shared/labels";
import { CATEGORY_KO } from "../../config/labelsKo";
import { getCompany, questionsForTrack, type CompanyQuestionCategory } from "../../../shared/companies";
import { isDuplicateQuestion } from "../../utils/fingerprint";
import { delay } from "../../utils/id";
import type { AIProvider } from "./AIProvider";
import {
  GENERAL,
  JD_TECHNICAL,
  OPENING,
  TECHNICAL,
  TYPE_PLAN,
  roleFamily,
  type Localized,
} from "./mock/questionBank";
import { CLOSING, hash, reactionFor } from "./mock/phrases";
import { extractMethods, extractTechs, josa, objectParticle, quoteAround, readSignals, topicPhrase, TOPICS, type Signals } from "./mock/signals";

const L = (lang: Language, ko: string, en: string) => (lang === "ko" ? ko : en);

/** Fills {var} and {var:을/를}-style slots (the particle is chosen to match the value). */
const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)(?::(을\/를|이\/가|은\/는|와\/과))?\}/g, (_, k: string, pair?: "을/를" | "이/가" | "은/는" | "와/과") => {
    const v = vars[k] ?? "";
    return pair ? v + josa(v, pair) : v;
  });

export class MockAIProvider implements AIProvider {
  readonly kind = "mock" as const;
  readonly label = "Mock Interviewer";

  constructor(private readonly latency = true) {}

  private wait(min: number, max: number) {
    return this.latency ? delay(min + Math.random() * (max - min)) : Promise.resolve();
  }

  /* ───────────────────────────── questions ───────────────────────────── */

  async generateQuestion(ctx: InterviewContext): Promise<GeneratedQuestion> {
    await this.wait(450, 900);
    const { config } = ctx;
    const lang = config.language;
    const asked = ctx.askedQuestions;
    const vars = { position: config.position, topic: "", jd: "" };

    // Earlier topics the candidate brought up — used to make "deep_dive" feel continuous.
    const earlierText = ctx.history.map((h) => h.answer).join("\n");
    const earlier = readSignals(earlierText, "", lang);
    const earlierTopic = TOPICS.find((t) => t.pattern.test(earlierText));
    vars.topic = earlier.project
      ? `‘${earlier.project}’`
      : earlier.roleClaim
        ? `‘${earlier.roleClaim}’`
        : earlierTopic
          ? earlierTopic.label[lang]
          : L(lang, "최근 프로젝트", "your recent project");

    const jdKeywords = [...extractTechs(config.jobDescription), ...extractMethods(config.jobDescription)];

    if (ctx.progress.asked === 0) {
      const openings = OPENING.filter((o) => o.tags?.includes(config.interviewType));
      const item = (openings.length ? openings : OPENING)[0];
      return { question: fill(item[lang], vars), type: "opening", intent: L(lang, "배경과 경험을 파악합니다.", "Understand background and experience.") };
    }

    // Company interview mode: ask from the researched question bank in a realistic order.
    const company = getCompany(config.companyId);
    if (company && lang === "ko") {
      const bank = questionsForTrack(company, config.companyTrack).filter((q) => !isDuplicateQuestion(q.text, asked));
      const lastT = ctx.usedTypes[ctx.usedTypes.length - 1];
      const n = ctx.usedTypes.length;
      for (let i = 0; i < COMPANY_PLAN.length; i++) {
        const type = COMPANY_PLAN[(n - 1 + i + COMPANY_PLAN.length) % COMPANY_PLAN.length];
        if (type === lastT) continue;
        const pool = bank.filter((q) => CATEGORY_TO_TYPE[q.category] === type);
        if (pool.length) {
          const q = pool[Math.floor(Math.random() * pool.length)];
          return { question: q.text, type, intent: `${company.name} ${q.basis === "후기" ? "면접 후기에 보고된" : "인재상·사업 기반"} ${q.category} 질문` };
        }
      }
    }

    const mainCount = ctx.usedTypes.length; // approximate position in plan
    const plan = TYPE_PLAN[config.interviewType];
    const lastType = ctx.usedTypes[ctx.usedTypes.length - 1];
    const order: QuestionType[] = [];
    for (let i = 0; i < plan.length; i++) order.push(plan[(mainCount + i) % plan.length]);
    // Don't ask for numbers the candidate just gave us.
    const recentlyQuantified = /\d/.test(ctx.history.slice(-2).map((h) => h.answer).join(" "));
    const candidatesTypes = order.filter(
      (t): t is Exclude<QuestionType, "opening"> => t !== "opening" && t !== lastType && !(t === "result" && recentlyQuantified),
    );

    for (const type of candidatesTypes) {
      const pool: Localized[] = [];
      if (type === "technical") {
        for (const kw of jdKeywords.slice(0, 3)) {
          for (const tpl of JD_TECHNICAL) pool.push({ ko: fill(tpl.ko, { jd: kw }), en: fill(tpl.en, { jd: kw }) });
        }
        pool.push(...TECHNICAL[roleFamily(config.position)], ...TECHNICAL.general);
      } else {
        const items = GENERAL[type];
        const tagged = items.filter((i) => !i.tags || i.tags.includes(config.interviewType));
        pool.push(...tagged, ...items);
      }
      for (const item of pool) {
        const q = fill(item[lang], vars);
        if (!isDuplicateQuestion(q, asked)) {
          return { question: q, type, intent: intentFor(type, lang) };
        }
      }
    }
    // Everything used (very long interviews) — ask a generic reflection.
    return {
      question: L(lang, "마지막으로, 이 직무에서 꼭 보여드리고 싶은 본인의 강점은 무엇인가요?", "Finally, what strength would you most like to show in this role?"),
      type: "reflection",
      intent: intentFor("reflection", lang),
    };
  }

  /* ───────────────────────────── follow-ups ──────────────────────────── */

  async generateFollowUp(ctx: InterviewContext, turn: CurrentTurn, depth: number): Promise<FollowUpDecision> {
    await this.wait(600, 1100);
    const lang = ctx.config.language;
    const s = readSignals(turn.answer, turn.question, lang);
    const none = (reason: string): FollowUpDecision => ({ needed: false, question: "", type: "deep_dive", reason, anchor: "" });
    const asked = ctx.askedQuestions;
    const ok = (f: FollowUpDecision) => (isDuplicateQuestion(f.question, asked) ? null : sanitizeFollowUp(f, turn.answer));

    if (s.dontKnow) {
      return none(L(lang, "지원자가 잘 모른다고 답해 다른 주제로 넘어갑니다.", "The candidate didn't know; moving to another topic."));
    }
    // Already asked them to elaborate and it's still one line — a real interviewer moves on.
    const concrete = s.topics.length > 0 || s.methods.length > 0 || s.techs.length > 0 || Boolean(s.project || s.roleClaim || s.metric);
    if (turn.isFollowUp && s.chars < 25 && !concrete) {
      return none(L(lang, "추가 설명을 요청했지만 답변이 짧아 다음 질문으로 넘어갑니다.", "Still brief after a follow-up; moving on."));
    }
    if (isOffTopic(s)) {
      return none(L(lang, "질문과 관련성이 낮아 다음 주제로 넘어갑니다.", "Answer drifted off-topic; moving on."));
    }

    const topic = s.topics[0];
    const action = s.star.action > 0;
    const opening = turn.type === "opening";
    const candidates: FollowUpDecision[] = [];
    const push = (question: Localized, type: QuestionType, reason: Localized, anchor = "") =>
      candidates.push({ needed: true, question: question[lang], type, reason: reason[lang], anchor });

    // 1) Two+ concrete methods → ask them to pick the most effective one.
    if (s.methods.length >= 2) {
      const [a, b] = s.methods;
      push(
        { ko: `${a}, ${b} 중 가장 효과적이었던 방법 하나를 골라 설명해주세요.`, en: `Between ${a} and ${b}, pick the one that helped most and explain how you used it.` },
        "technical",
        { ko: `'${a}'${josa(a, "와/과")} '${b}'${josa(b, "을/를")} 언급했지만 각각을 어떻게 활용했는지는 설명되지 않았습니다.`, en: `Mentions '${a}' and '${b}' but not how each was used.` },
        a,
      );
    }

    // 2) A topic claim without the "how".
    if (topic && (!action || s.chars < 40) && s.methods.length < 2) {
      const q = TOPIC_HOW[topic.id];
      if (q) push(q, "deep_dive", { ko: `'${topic.label.ko}'${josa(topic.label.ko, "을/를")} 언급했지만 해결 과정이 구체적으로 설명되지 않았습니다.`, en: `Mentions ${topic.label.en} but not how it was handled.` }, topicPhrase(turn.answer, topic.pattern));
    }

    // Hypothetical ("what would you do if…") answers get a stress-test, not "what did you do".
    const hypothetical = turn.type === "challenge";
    if (hypothetical && depth === 0 && s.chars >= 25) {
      push(
        /팀|합의|설득|동료|상사|team|agree/i.test(turn.answer)
          ? { ko: "만약 팀원들이 그 우선순위에 반대한다면 어떻게 설득하시겠어요?", en: "What if your team disagreed with those priorities — how would you persuade them?" }
          : { ko: "그렇게 했을 때 생길 수 있는 리스크는 무엇이고, 어떻게 대비하시겠어요?", en: "What risks does that choice create, and how would you handle them?" },
        "challenge",
        { ko: "가정 상황에 대한 판단 기준이 실제로 버틸 수 있는지 확인합니다.", en: "Stress-test the judgment behind the hypothetical answer." },
      );
    }

    // 3) Team did it — what did *you* do?
    if (s.teamOnly && !hypothetical) {
      push(
        { ko: "그중 본인이 직접 해결한 부분은 무엇인가요?", en: "Which part of that did you personally handle?" },
        "deep_dive",
        { ko: "팀 단위의 활동은 설명했지만 본인의 역할이 확인되지 않습니다.", en: "Describes team work but not the candidate's own role." },
        turn.answer.match(/팀|우리|저희|\bwe\b|\bteam\b/i)?.[0] ?? "",
      );
    }

    // 4) Something they owned or built — real interviewers dig into it.
    if (depth === 0 && (s.roleClaim || s.project)) {
      const k = s.roleClaim || s.project;
      push(
        s.roleClaim
          ? { ko: `${k}${objectParticle(k)} 맡으시면서 가장 어려웠던 점은 무엇이었나요?`, en: `What was the hardest part of owning ${k}?` }
          : { ko: `${k}${projectVerb(k)} 가장 어려웠던 점은 무엇이었나요?`, en: `What was the hardest part of ${k}?` },
        "deep_dive",
        { ko: `'${k}'${josa(k, "을/를")} 언급했지만 그 과정에서의 어려움과 본인의 판단은 아직 나오지 않았습니다.`, en: `Mentions '${k}' but not the challenges or the candidate's decisions.` },
        k,
      );
    }

    // 5) Actions but no result.
    if (action && s.star.result === 0 && s.numbers.length === 0 && !opening) {
      push(
        { ko: "그 결과 어떤 변화가 있었나요? 가능하면 수치로 말씀해주세요.", en: "What changed as a result? Numbers would help if you have them." },
        "result",
        { ko: "행동은 설명했지만 결과나 성과가 언급되지 않았습니다.", en: "Actions described, but no result or impact." },
      );
    }

    // 6) A number claim — verify how it was measured.
    if (depth === 0 && s.metric) {
      push(
        { ko: `말씀하신 '${s.metric}'${josa(s.metric, "은/는")} 어떻게 측정하거나 확인하셨나요?`, en: `How did you measure or verify the '${s.metric}' you mentioned?` },
        "result",
        { ko: `'${s.metric}'이라는 수치를 제시했지만 측정 방법은 언급되지 않았습니다.`, en: `Gives '${s.metric}' but not how it was measured.` },
        s.metric,
      );
    }

    // 7) A technology choice → why that one? (prefer frameworks/infra over languages)
    const tech = s.techs.find((t) => !/^(?:TypeScript|JavaScript|Java|Python|Go|Golang|Kotlin|Rust|SQL)$/i.test(t)) ?? (s.techs.length === 1 ? s.techs[0] : undefined) ?? (s.methods.length === 1 ? s.methods[0] : undefined);
    if (tech) {
      push(
        { ko: `${tech}${objectParticle(tech)} 선택한 이유는 무엇이었나요? 다른 대안과 비교해서 설명해주세요.`, en: `Why ${tech}? How did it compare to the alternatives?` },
        "technical",
        { ko: `'${tech}'${josa(tech, "을/를")} 사용했다고 했지만 선택 이유는 언급되지 않았습니다.`, en: `Uses '${tech}' but doesn't say why.` },
        tech,
      );
    }

    // 8) Too short to work with — ask them to expand (naturally, depending on the question).
    if (s.chars < 25) {
      push(
        opening
          ? { ko: "조금 더 자세히 말씀해 주시겠어요? 어떤 경험을 해 오셨는지 궁금합니다.", en: "Could you tell me a bit more? I'd like to hear what you've worked on." }
          : { ko: "조금 더 구체적으로 말씀해 주시겠어요? 실제 경험 한 가지를 예로 들어 주세요.", en: "Could you be more specific? Give me one real example." },
        "deep_dive",
        { ko: "답변이 짧아 판단할 근거가 부족합니다.", en: "The answer is too short to assess." },
      );
    }

    // 9) Vague (a substantial self-introduction is not "abstract" — move on instead).
    if (!action && !topic && s.methods.length === 0 && !s.project && !s.roleClaim && !(opening && s.chars > 80)) {
      push(
        { ko: "조금 추상적으로 들리는데, 실제 사례를 하나 들어주실 수 있을까요?", en: "That sounds a bit abstract — could you give me one real example?" },
        "deep_dive",
        { ko: "답변에서 구체적인 사례가 확인되지 않습니다.", en: "No concrete example in the answer." },
      );
    }

    // Deeper threads need a stronger reason to continue.
    if (depth >= 2) return none(L(lang, "이 주제는 충분히 다뤘습니다.", "This thread has been covered enough."));
    for (const c of candidates) {
      const f = ok(c);
      if (f && f.needed) return f;
    }
    return none(L(lang, "답변이 충분히 구체적이어서 다음 주제로 넘어갑니다.", "The answer was specific enough; moving on."));
  }

  /* ───────────────────────────── analysis ────────────────────────────── */

  async analyzeAnswer(ctx: InterviewContext, turn: CurrentTurn): Promise<AnswerAnalysis> {
    await this.wait(700, 1300);
    const lang = ctx.config.language;
    const s = readSignals(turn.answer, turn.question, lang);
    const seed = hash(turn.answer + turn.question);
    const jitter = (k: number) => ((seed >> k) % 7) - 3;

    const lengthBase = s.chars < 20 ? 34 : s.chars < 60 ? 52 : s.chars < 150 ? 64 : s.chars < 700 ? 71 : 65;
    // Complete, owned stories (situation → action → result, in first person, with numbers) earn a bonus.
    const completeness = (s.firstPerson ? 3 : 0) + (s.numbers.length ? 3 : 0) + (s.star.situation && s.star.action && s.star.result ? 4 : 0);
    const starCount = (["situation", "task", "action", "result"] as const).filter((k) => s.star[k] > 0).length;

    const raw: Record<CategoryKey, number> = {
      relevance: lengthBase + 6 + completeness + Math.min(18, s.questionOverlap * 60) + (s.topics.length ? 4 : 0),
      logic: lengthBase + completeness + Math.min(12, s.causal * 5) + Math.min(8, s.structureMarkers * 3),
      specificity: lengthBase - 6 + completeness + Math.min(16, s.numbers.length * 8) + Math.min(14, s.methods.length * 5) + Math.min(6, s.techs.length * 3),
      structure: lengthBase - 4 + completeness + starCount * 4 + Math.min(10, s.structureMarkers * 4),
      communication: lengthBase + 6 + completeness - s.fillers * 4 - (s.sentences.some((x) => x.length > 220) ? 8 : 0),
      confidence: lengthBase + completeness + (s.firstPerson ? 10 : 0) - s.hedges * 7,
    };
    const scores = {} as AnswerAnalysis["scores"];
    CATEGORY_KEYS.forEach((k, i) => {
      scores[k] = { score: clampScore(raw[k] + jitter(i * 3)), reason: reasonFor(k, s) };
    });

    const avg = CATEGORY_KEYS.reduce((a, k) => a + scores[k].score, 0) / CATEGORY_KEYS.length;
    const quality: AnswerQuality =
      s.dontKnow || s.chars < 20 ? "insufficient" : isOffTopic(s) ? "off_topic" : avg >= 78 ? "strong" : avg >= 62 ? "adequate" : s.chars < 60 ? "insufficient" : "vague";

    const starApplicable = turn.type !== "technical" || /경험|사례|프로젝트|때|experience|time|project/i.test(turn.question);
    const part = (n: number, strongAt: number, notes: [string, string, string]): StarPart => ({
      status: n >= strongAt ? "present" : n > 0 ? "partial" : "missing",
      note: n >= strongAt ? notes[0] : n > 0 ? notes[1] : notes[2],
    });
    const star = {
      applicable: starApplicable,
      situation: part(s.star.situation, 1, [L(lang, "배경이 언급되었습니다.", "Context is given."), L(lang, "배경이 간략합니다.", "Context is brief."), L(lang, "상황 설명이 확인되지 않습니다.", "No situation described.")]),
      task: part(s.star.task, 1, [L(lang, "본인의 역할/목표가 드러납니다.", "Role/goal is stated."), L(lang, "역할이 암시만 됩니다.", "Role is only implied."), L(lang, "본인의 역할이나 목표가 확인되지 않습니다.", "No role or goal stated.")]),
      action: part(s.star.action + (s.firstPerson ? 1 : 0), 2, [L(lang, "직접 한 행동이 설명되었습니다.", "Personal actions are described."), L(lang, "행동이 있지만 본인 기여가 불분명합니다.", "Actions exist but personal contribution is unclear."), L(lang, "구체적인 행동이 확인되지 않습니다.", "No concrete actions described.")]),
      result: part(s.star.result + s.numbers.length, 2, [L(lang, "결과가 구체적으로 제시되었습니다.", "Result is specific."), L(lang, "결과가 언급되었지만 수치가 없습니다.", "Result mentioned without numbers."), L(lang, "결과가 확인되지 않습니다.", "No result mentioned.")]),
    };

    const evidence = [...s.numbers.map((n) => quoteAround(turn.answer, n.trim())), ...s.methods.map((m) => quoteAround(turn.answer, m)), ...s.techs.map((t) => quoteAround(turn.answer, t))]
      .filter(Boolean)
      .slice(0, 3);
    if (!evidence.length && s.sentences[0]) evidence.push(s.sentences[0].slice(0, 60));

    const notFound: string[] = [];
    if (!s.numbers.length) notFound.push(L(lang, "결과를 보여주는 수치", "Numbers showing the result"));
    if (!s.firstPerson) notFound.push(L(lang, "본인이 직접 한 역할", "Your personal role"));
    if (!s.methods.length && !s.techs.length) notFound.push(L(lang, "사용한 방법이나 도구", "Methods or tools used"));

    const sorted = [...CATEGORY_KEYS].sort((a, b) => scores[b].score - scores[a].score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return sanitizeAnalysis(
      {
        quality,
        scores,
        star,
        strength: s.dontKnow
          ? L(lang, "모르는 부분을 솔직하게 인정했습니다.", "You were honest about what you don't know.")
          : avg < 55
            ? s.firstPerson
              ? L(lang, "본인의 입장을 분명하게 말했습니다.", "You stated your own position clearly.")
              : L(lang, "질문에 바로 답하려는 태도가 보였습니다.", "You responded directly.")
            : strengthFor(best, s),
        improve: s.dontKnow
          ? L(lang, "모르는 질문도 '직접 해 보진 않았지만 저라면 ~부터 확인하겠습니다'처럼 접근 방법을 말하면 좋습니다.", "Even when you don't know, explain how you would approach it.")
          : s.chars < 25
            ? L(lang, "답변이 너무 짧습니다. 결론 한 문장에 근거가 되는 경험을 2~3문장 덧붙여 보세요.", "Too short — add two or three sentences of supporting experience.")
            : improveFor(worst, s),
        betterAnswer: s.dontKnow
          ? {
              problem: L(lang, "답변을 포기함", "Declined to answer"),
              suggestion: L(lang, "모른다고 끝내지 말고 생각의 순서를 보여주기", "Show how you'd reason about it"),
              example: L(lang, "“직접 경험은 없지만, 저라면 먼저 [확인할 지표]를 보고 [접근 방법]으로 원인을 좁혀 보겠습니다.”", "“I haven't done it myself, but I'd start by checking [metric] and narrow it down with [approach].”"),
            }
          : betterAnswerFor(worst, s),
        evidence,
        notFound,
        reaction: s.dontKnow ? dontKnowReaction(ctx.config.persona, lang) : reactionFor(quality, ctx.config.persona, lang, seed),
      },
      turn.answer,
    );
  }

  /* ───────────────────────────── report ──────────────────────────────── */

  async generateFinalReport(req: ReportRequest): Promise<FinalReport> {
    await this.wait(700, 1200);
    const lang = req.config.language;
    const { strongest, weakest, overall, categoryScores } = req.computed;
    const bestTurn = [...req.turns].sort((a, b) => b.score - a.score)[0];
    const worstTurn = [...req.turns].sort((a, b) => a.score - b.score)[0];
    const bestIdx = req.turns.indexOf(bestTurn) + 1;
    const worstIdx = req.turns.indexOf(worstTurn) + 1;
    const names = lang === "ko" ? CATEGORY_KO : CATEGORY_LABEL;
    const sName = names[strongest];
    const wName = names[weakest];

    const headline =
      overall >= 80
        ? L(lang, `전반적으로 안정적인 면접이었습니다. 특히 ${sName}${josa(sName, "이/가")} 돋보였습니다.`, `A solid interview overall — ${sName} stood out.`)
        : overall >= 65
          ? L(lang, `기본기는 갖췄지만 ${wName}${josa(wName, "을/를")} 보완하면 답변이 훨씬 강해질 수 있습니다.`, `Good foundations; improving ${wName} would make your answers much stronger.`)
          : L(lang, `답변을 더 구체적으로 구성하는 연습이 필요합니다.`, `Practice making your answers more concrete and structured.`);

    return {
      headline,
      topFeedback: TOP_FEEDBACK[weakest][lang],
      strengths: [
        L(lang, `${sName} 점수가 ${categoryScores[strongest]}점으로 가장 높았습니다.`, `${sName} was your highest category at ${categoryScores[strongest]}.`),
        L(lang, `Q${bestIdx}: ${bestTurn.strength}`, `Q${bestIdx}: ${bestTurn.strength}`),
      ],
      improvements: [
        L(lang, `${wName} 점수(${categoryScores[weakest]}점)를 높이는 것이 가장 큰 개선 포인트입니다.`, `${wName} (${categoryScores[weakest]}) is the biggest opportunity.`),
        L(lang, `Q${worstIdx}: ${worstTurn.improve}`, `Q${worstIdx}: ${worstTurn.improve}`),
      ],
      nextSteps: NEXT_STEPS[weakest][lang],
      closingRemark: CLOSING[req.config.persona][lang],
    };
  }
}

/* ───────────────────────────── copy helpers ──────────────────────────── */

const COMPANY_PLAN: QuestionType[] = ["motivation", "deep_dive", "technical", "challenge", "reflection", "technical", "deep_dive"];
const CATEGORY_TO_TYPE: Record<CompanyQuestionCategory, QuestionType> = {
  기업이해: "motivation",
  경험: "deep_dive",
  인성: "reflection",
  상황: "challenge",
  "PT·토론": "challenge",
  직무: "technical",
  기술: "technical",
};

/** "쇼핑몰 프로젝트를 진행하면서", "결제 시스템을 만들면서", "현장실습에서" */
function projectVerb(k: string): string {
  if (/(?:서비스|기능|플랫폼|시스템|파이프라인|대시보드|앱)$/.test(k)) return `${objectParticle(k)} 만들면서`;
  if (/(?:프로젝트|캠페인)$/.test(k)) return `${objectParticle(k)} 진행하면서`;
  return "에서";
}

/** Only call an answer off-topic when there's nothing concrete to hold on to. */
function isOffTopic(s: Signals): boolean {
  return s.questionOverlap < 0.02 && s.chars > 80 && !s.topics.length && !s.methods.length && !s.techs.length && !s.project && !s.roleClaim;
}

function dontKnowReaction(persona: InterviewContext["config"]["persona"], lang: Language): string {
  if (persona === "strict") return L(lang, "알겠습니다. 다음으로 넘어가죠.", "Understood. Let's move on.");
  if (persona === "friendly") return L(lang, "괜찮아요. 다른 질문으로 넘어가 볼게요.", "That's fine — let's try another question.");
  return L(lang, "괜찮습니다. 다음 질문으로 넘어가겠습니다.", "That's alright. Let's move to the next question.");
}

const TOPIC_HOW: Record<string, Localized> = {
  performance: { ko: "그 성능 문제의 원인은 구체적으로 어떻게 찾으셨나요?", en: "How exactly did you find the cause of that performance issue?" },
  incident: { ko: "그 장애의 원인은 어떻게 파악하셨나요?", en: "How did you identify the root cause of that incident?" },
  conflict: { ko: "그 의견 차이는 구체적으로 어떻게 좁히셨나요?", en: "How exactly did you close that disagreement?" },
  deadline: { ko: "촉박한 일정 속에서 무엇을 먼저 하기로 결정하셨나요?", en: "Under that deadline, what did you decide to do first?" },
  architecture: { ko: "그 구조를 선택한 가장 큰 이유는 무엇이었나요?", en: "What was the main reason you chose that structure?" },
  data: { ko: "그 분석에서 어떤 지표를 가장 중요하게 보셨나요?", en: "Which metric did you focus on most in that analysis?" },
  user: { ko: "사용자의 문제를 어떤 방법으로 확인하셨나요?", en: "How did you confirm what the users' problem really was?" },
  collaboration: { ko: "협업 과정에서 본인이 맡은 역할은 무엇이었나요?", en: "What was your specific role in that collaboration?" },
  leadership: { ko: "팀을 이끌면서 가장 어려웠던 순간은 언제였나요?", en: "What was the hardest moment while leading the team?" },
  failure: { ko: "그 실패의 원인을 스스로 어떻게 분석하셨나요?", en: "How did you analyze why it failed?" },
  learning: { ko: "새로운 내용을 익힐 때 어떤 방법이 가장 효과적이었나요?", en: "What method worked best for you when learning it?" },
};

function intentFor(type: QuestionType, lang: Language): string {
  const m: Record<QuestionType, Localized> = {
    opening: { ko: "배경과 경험을 파악합니다.", en: "Understand background." },
    motivation: { ko: "지원 동기와 기업·직무 이해도를 확인합니다.", en: "Check motivation and company understanding." },
    deep_dive: { ko: "구체적인 상황을 깊게 확인합니다.", en: "Dig into a concrete situation." },
    technical: { ko: "기술적 판단 기준을 확인합니다.", en: "Check technical decision-making." },
    challenge: { ko: "예상치 못한 상황에서의 판단을 봅니다.", en: "Test judgment under a counter-scenario." },
    reflection: { ko: "경험에서 배운 점을 확인합니다.", en: "Check learning and self-awareness." },
    result: { ko: "성과와 임팩트를 검증합니다.", en: "Verify outcomes and impact." },
  };
  return m[type][lang];
}

function reasonFor(k: CategoryKey, s: Signals): string {
  const ko = s.lang === "ko";
  switch (k) {
    case "relevance":
      return s.questionOverlap > 0.12 || s.topics.length
        ? ko ? "질문의 핵심 주제에 맞춰 답변했습니다." : "Stays on the question's topic."
        : ko ? "질문과 답변의 연결이 약하게 느껴집니다." : "The link to the question feels weak.";
    case "logic":
      return s.causal > 0
        ? ko ? "원인과 결과를 연결해 설명했습니다." : "Connects causes and effects."
        : ko ? "왜 그렇게 했는지에 대한 이유가 드러나지 않습니다." : "The 'why' behind decisions is missing.";
    case "specificity":
      if (s.numbers.length) return ko ? `수치(${s.numbers[0].trim()})를 사용해 구체성이 높습니다.` : `Uses numbers (${s.numbers[0].trim()}), which adds precision.`;
      if (s.methods.length || s.techs.length) {
        const k2 = [...s.methods, ...s.techs].slice(0, 2).join(", ");
        return ko ? `사용한 방법(${k2})을 언급했지만 수치는 없습니다.` : `Names methods (${k2}) but gives no numbers.`;
      }
      return ko ? "구체적인 방법, 도구, 수치가 확인되지 않습니다." : "No concrete methods, tools or numbers.";
    case "structure":
      return s.structureMarkers > 0 || (s.star.situation && s.star.action && s.star.result)
        ? ko ? "상황 → 행동 → 결과 흐름이 비교적 명확합니다." : "Situation → action → result flow is fairly clear."
        : ko ? "답변의 순서가 정리되어 있지 않습니다." : "The answer lacks a clear order.";
    case "communication":
      return s.chars < 25
        ? ko ? "답변이 너무 짧아 전달력이 제한적입니다." : "Too short to communicate much."
        : s.fillers > 1
          ? ko ? "군더더기 표현이 전달을 방해합니다." : "Filler words get in the way."
          : ko ? "문장이 간결하게 전달됩니다." : "Sentences are concise.";
    case "confidence":
      return s.hedges > 0
        ? ko ? "'~것 같다' 같은 표현이 확신을 약하게 만듭니다." : "Hedging phrases weaken the answer."
        : s.firstPerson
          ? ko ? "본인이 주도한 부분을 분명하게 말했습니다." : "Clearly owns the actions described."
          : ko ? "본인의 기여가 드러나지 않아 확신이 약해 보입니다." : "Personal ownership isn't clear.";
  }
}

function strengthFor(k: CategoryKey, s: Signals): string {
  const ko = s.lang === "ko";
  const m: Record<CategoryKey, string> = {
    relevance: ko ? "질문의 의도에 맞춰 핵심을 바로 짚었습니다." : "Answered the actual question directly.",
    logic: ko ? "판단의 이유를 논리적으로 설명했습니다." : "Explained the reasoning logically.",
    specificity: ko ? "구체적인 방법과 사례로 답변을 뒷받침했습니다." : "Backed the answer with concrete methods and examples.",
    structure: ko ? "상황과 행동, 결과의 흐름이 잘 정리되어 있습니다." : "Well structured from situation to result.",
    communication: ko ? "간결하고 이해하기 쉽게 전달했습니다." : "Concise and easy to follow.",
    confidence: ko ? "본인의 역할과 결정을 분명하게 말했습니다." : "Spoke clearly about your own role and decisions.",
  };
  return s.chars < 20 ? (ko ? "질문에 바로 답하려는 태도가 보였습니다." : "You responded directly.") : m[k];
}

function improveFor(k: CategoryKey, s: Signals): string {
  const ko = s.lang === "ko";
  const m: Record<CategoryKey, string> = {
    relevance: ko ? "질문이 묻는 핵심에 먼저 답한 뒤 배경을 덧붙이세요." : "Answer the core of the question first, then add context.",
    logic: ko ? "왜 그 방법을 선택했는지 이유를 한 문장 추가하세요." : "Add one sentence on why you chose that approach.",
    specificity: ko ? "성과를 수치로 표현하면 더 명확합니다." : "Quantify the outcome to make it clearer.",
    structure: ko ? "상황 → 행동 → 결과 순서로 정리해 말해보세요." : "Try ordering it as situation → action → result.",
    communication: ko ? "한 문장에 하나의 내용만 담아 간결하게 말해보세요." : "Keep one idea per sentence.",
    confidence: ko ? "'저는 ~을 했습니다'처럼 본인의 행동을 주어로 말해보세요." : "Use 'I did…' to make your own actions explicit.",
  };
  return m[k];
}

function betterAnswerFor(k: CategoryKey, s: Signals): AnswerAnalysis["betterAnswer"] {
  const ko = s.lang === "ko";
  const m: Record<CategoryKey, AnswerAnalysis["betterAnswer"]> = {
    relevance: {
      problem: ko ? "질문의 핵심과 답변의 초점이 어긋남" : "Focus drifts from the question",
      suggestion: ko ? "첫 문장에서 질문에 대한 결론을 먼저 말하기" : "Lead with a one-sentence direct answer",
      example: ko ? "“가장 어려웠던 점은 [핵심 문제]였고, 저는 [해결 방법]으로 해결했습니다.”" : "“The hardest part was [core problem], and I solved it by [approach].”",
    },
    logic: {
      problem: ko ? "결정의 이유가 드러나지 않음" : "Reasoning behind decisions is missing",
      suggestion: ko ? "선택지와 선택 이유를 함께 말하기" : "State the options and why you picked one",
      example: ko ? "“[대안 A]와 [대안 B]를 비교했고, [기준] 때문에 [선택]을 택했습니다.”" : "“I compared [option A] and [option B] and chose [choice] because of [criterion].”",
    },
    specificity: {
      problem: ko ? "성과가 추상적임" : "The outcome is abstract",
      suggestion: ko ? "수치를 사용해 결과를 설명" : "Describe the result with numbers",
      example: ko ? "“[지표]를 [이전 수치]에서 [개선 수치]로 개선했습니다.”" : "“I improved [metric] from [before] to [after].”",
    },
    structure: {
      problem: ko ? "답변 흐름이 정리되지 않음" : "The answer has no clear flow",
      suggestion: ko ? "STAR(상황-과제-행동-결과) 순서로 말하기" : "Follow STAR: situation, task, action, result",
      example: ko ? "“[상황]에서 저는 [과제]를 맡았고, [행동]을 해서 [결과]를 만들었습니다.”" : "“In [situation], I owned [task], did [action], and achieved [result].”",
    },
    communication: {
      problem: ko ? "문장이 길거나 불필요한 표현이 많음" : "Long sentences or filler",
      suggestion: ko ? "핵심 → 근거 → 결과를 짧은 문장으로" : "Short sentences: point → evidence → result",
      example: ko ? "“핵심은 [요점]입니다. [근거] 덕분에 [결과]가 나왔습니다.”" : "“The key point is [point]. Because of [evidence], we got [result].”",
    },
    confidence: {
      problem: ko ? "본인의 기여가 불분명하거나 표현이 조심스러움" : "Ownership is unclear or hedged",
      suggestion: ko ? "'저는'을 주어로, 단정적인 표현 사용" : "Use 'I' and decisive wording",
      example: ko ? "“저는 [구체적 행동]을 직접 제안하고 실행했습니다.”" : "“I personally proposed and executed [specific action].”",
    },
  };
  return m[k];
}

const TOP_FEEDBACK: Record<CategoryKey, Localized> = {
  relevance: { ko: "질문의 핵심에 대한 답을 첫 문장에 먼저 말하면 전달력이 크게 좋아집니다.", en: "Lead with a direct answer to the question in your first sentence." },
  logic: { ko: "무엇을 했는지뿐 아니라 왜 그렇게 판단했는지를 함께 설명해보세요.", en: "Explain not just what you did, but why you decided to do it." },
  specificity: { ko: "답변의 핵심은 명확하지만 결과와 수치를 조금 더 구체적으로 표현하면 좋습니다.", en: "Your points are clear — add concrete results and numbers to make them land." },
  structure: { ko: "상황 → 행동 → 결과 순서로 답변을 정리하면 훨씬 설득력 있게 들립니다.", en: "Organize answers as situation → action → result to sound more convincing." },
  communication: { ko: "한 문장에 한 가지 내용만 담아 짧고 명확하게 말하는 연습을 해보세요.", en: "Practice short sentences with one idea each." },
  confidence: { ko: "'저는 ~했습니다'처럼 본인의 역할과 결정을 분명하게 말해보세요.", en: "State your own role and decisions plainly — 'I did…'." },
};

const NEXT_STEPS: Record<CategoryKey, Record<Language, string[]>> = {
  relevance: { ko: ["질문을 한 문장으로 요약한 뒤 답변 시작하기", "결론 먼저 말하는 연습 5회"], en: ["Restate the question in one line before answering", "Practice answer-first responses 5 times"] },
  logic: { ko: ["주요 경험마다 '왜?'를 3번 적어보기", "대안 비교 → 선택 이유 구조로 답변 정리"], en: ["Write 'why?' three times for each key experience", "Frame answers as options → choice → reason"] },
  specificity: { ko: ["대표 경험 3개에 대해 전후 수치 정리하기", "사용한 도구와 방법을 한 줄씩 적어두기"], en: ["Write before/after numbers for 3 key experiences", "List the tools and methods you used for each"] },
  structure: { ko: ["대표 경험을 STAR 템플릿으로 정리하기", "1분 안에 STAR로 말하는 연습"], en: ["Rewrite key stories with a STAR template", "Practice 1-minute STAR answers"] },
  communication: { ko: ["답변을 녹음해 군더더기 표현 체크하기", "한 문장 30자 이내로 말하는 연습"], en: ["Record answers and count filler words", "Keep sentences under ~15 words"] },
  confidence: { ko: ["'저는'으로 시작하는 문장으로 경험 다시 말하기", "'~것 같다' 표현을 줄이는 연습"], en: ["Retell experiences starting with 'I'", "Remove hedges like 'I think' / 'maybe'"] },
};
