/**
 * Interview orchestrator. Owns the state machine and runs the conversation:
 * ask → listen → analyze (+ follow-up decision in parallel) → react → ask …
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedQuestion, ReportRequest, Usage } from "../../shared/schemas";
import { SAMPLE_ANSWERS } from "../config/sampleAnswers";
import { AIRequestError, type AIProvider } from "../services/ai/AIProvider";
import { injectFailure } from "../services/ai/faults";
import { MockAIProvider } from "../services/ai/MockAIProvider";
import { createProvider, detectProviderStatus, type ProviderStatus } from "../services/ai/providerFactory";
import { cancelSpeech, isSpeechSynthesisSupported, speak } from "../services/speech/speechSynthesis";
import { currentQuestion, initialState, reducer, type Action, type InterviewState } from "../state/interviewMachine";
import type { Interview, InterviewConfig, InterviewQuestion, ProviderKind } from "../types/interview";
import { buildContext, toAIConfig, toCurrentTurn } from "../utils/context";
import { isDuplicateQuestion } from "../utils/fingerprint";
import { createId, delay } from "../utils/id";
import { canAskFollowUp, isLastQuestion, threadDepth } from "../utils/policy";
import { answerScore, strongestAndWeakest } from "../utils/scoring";
import { saveInterview } from "../utils/storage";

const speechLang = (c: InterviewConfig) => (c.language === "ko" ? "ko-KR" : "en-US");

interface NextQuestion {
  gen: GeneratedQuestion;
  isFollowUp: boolean;
  parentId: string | null;
  reason?: string;
  anchor?: string;
  source: ProviderKind;
}

export interface TokenStatus {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  lastModel: string | null;
}

export function useInterview() {
  const [state, setState] = useState<InterviewState>(initialState);
  const stateRef = useRef<InterviewState>(initialState);
  const dispatch = useCallback((a: Action) => {
    stateRef.current = reducer(stateRef.current, a);
    setState(stateRef.current);
  }, []);

  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [tokens, setTokens] = useState<TokenStatus>({ calls: 0, inputTokens: 0, outputTokens: 0, lastModel: null });
  const [storageOk, setStorageOk] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceRef = useRef(true);
  const [speaking, setSpeaking] = useState(false);
  const [providerLabel, setProviderLabel] = useState("Mock Interviewer");

  const providerRef = useRef<AIProvider>(new MockAIProvider());
  const mockRef = useRef<MockAIProvider>(new MockAIProvider());
  const runRef = useRef(0);
  const firstQuestionRef = useRef<Promise<NextQuestion> | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  // Indirection so retry closures can re-enter these async flows.
  const processRef = useRef<(q: InterviewQuestion, answer: string, run: number) => Promise<void>>(async () => undefined);
  const introRef = useRef<() => Promise<void>>(async () => undefined);
  const forceFollowUpRef = useRef(false);
  const forceNextRef = useRef(false);

  const onUsage = useCallback((u: Usage) => {
    setTokens((t) => ({ calls: t.calls + 1, inputTokens: t.inputTokens + u.inputTokens, outputTokens: t.outputTokens + u.outputTokens, lastModel: u.model }));
  }, []);

  /* ─────────────────────────── provider mode ─────────────────────────── */

  useEffect(() => {
    let alive = true;
    detectProviderStatus().then((s) => {
      if (!alive) return;
      setStatus(s);
      providerRef.current = createProvider(s.mode, s.model, onUsage);
      setProviderLabel(providerRef.current.label);
    });
    return () => {
      alive = false;
    };
  }, [onUsage]);

  const switchToMock = useCallback(() => {
    providerRef.current = createProvider("mock", null);
    setProviderLabel(providerRef.current.label);
    setFallbackActive(true);
  }, []);

  /* ─────────────────────────── voice helpers ─────────────────────────── */

  const say = useCallback(async (text: string, run: number) => {
    const i = stateRef.current.interview;
    if (!i) return;
    if (voiceRef.current && isSpeechSynthesisSupported()) {
      setSpeaking(true);
      await speak(text, speechLang(i.config));
      if (runRef.current === run) setSpeaking(false);
    } else {
      // Give the reader time proportional to the text (short, never sluggish).
      await delay(Math.min(1700, 650 + text.length * 14));
    }
  }, []);

  const setVoice = useCallback((on: boolean) => {
    voiceRef.current = on;
    setVoiceOn(on);
    if (!on) {
      cancelSpeech();
      setSpeaking(false);
    }
  }, []);

  const skipSpeaking = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
  }, []);

  /* ─────────────────────────── question flow ─────────────────────────── */

  const fail = useCallback(
    (err: unknown, retry: () => void) => {
      const kind = err instanceof AIRequestError ? err.kind : "unknown";
      const message = err instanceof Error ? err.message : "Something went wrong.";
      retryRef.current = retry;
      cancelSpeech();
      setSpeaking(false);
      dispatch({ type: "FAIL", error: { kind, message } });
    },
    [dispatch],
  );

  /** Generates a main question, guarding against repeats (retry once, then mock bank). */
  const nextMainQuestion = useCallback(async (interview: Interview): Promise<NextQuestion> => {
    const ctx = buildContext(interview);
    const provider = providerRef.current;
    let gen = await provider.generateQuestion(ctx);
    let source: ProviderKind = provider.kind;
    if (isDuplicateQuestion(gen.question, ctx.askedQuestions)) {
      gen = await provider.generateQuestion(ctx);
      if (isDuplicateQuestion(gen.question, ctx.askedQuestions)) {
        gen = await mockRef.current.generateQuestion(ctx);
        source = "mock";
      }
    }
    return { gen, isFollowUp: false, parentId: null, source };
  }, []);

  const present = useCallback(
    async (next: NextQuestion, run: number, reaction?: string) => {
      const question: InterviewQuestion = {
        id: createId("q"),
        text: next.gen.question,
        type: next.gen.type,
        isFollowUp: next.isFollowUp,
        parentId: next.parentId,
        followUpReason: next.reason ?? next.gen.intent,
        anchor: next.anchor || undefined,
        reaction,
        askedAt: Date.now(),
        answer: null,
        feedback: null,
        score: null,
        followUps: [],
        source: next.source,
      };
      dispatch({ type: "QUESTION", question, now: Date.now() });
      await say(question.text, run);
      if (runRef.current === run) dispatch({ type: "LISTEN" });
    },
    [dispatch, say],
  );

  const complete = useCallback(
    async (endedEarly: boolean, run: number) => {
      cancelSpeech();
      setSpeaking(false);
      dispatch({ type: "COMPLETE", endedEarly, now: Date.now() });
      const i = stateRef.current.interview!;
      if (!i.questions.length || !i.categoryScores || i.overallScore === null) {
        dispatch({ type: "OPEN_SETUP" });
        return;
      }
      const { strongest, weakest } = strongestAndWeakest(i.categoryScores);
      const req: ReportRequest = {
        config: toAIConfig(i),
        turns: i.questions.map((q) => ({
          question: q.text.slice(0, 600),
          type: q.type,
          isFollowUp: q.isFollowUp,
          answerExcerpt: (q.answer ?? "").slice(0, 800),
          score: q.score ?? 0,
          strength: q.feedback!.strength.slice(0, 400),
          improve: q.feedback!.improve.slice(0, 400),
        })),
        computed: { overall: i.overallScore, categoryScores: i.categoryScores, strongest, weakest },
      };
      const minShow = delay(2200);
      let report;
      let source: ProviderKind = providerRef.current.kind;
      try {
        report = await providerRef.current.generateFinalReport(req);
      } catch {
        // The report must never block the result screen — fall back to the mock writer.
        report = await mockRef.current.generateFinalReport(req);
        source = "mock";
      }
      await minShow;
      if (runRef.current !== run) return;
      dispatch({ type: "REPORT", report, source });
      setStorageOk(saveInterview(stateRef.current.interview!));
    },
    [dispatch],
  );

  const processAnswer = useCallback(
    async (q: InterviewQuestion, answer: string, run: number) => {
      const before = stateRef.current.interview!;
      const ctxBefore = buildContext({ ...before, questions: before.questions.map((x) => (x.id === q.id ? { ...x, answer: null } : x)) });
      const turn = toCurrentTurn(q, answer);
      const provider = providerRef.current;
      const last = isLastQuestion(before);
      const forceFollowUp = forceFollowUpRef.current;
      const forceNext = forceNextRef.current;
      forceFollowUpRef.current = false;
      forceNextRef.current = false;
      const wantFollowUp = !last && !forceNext && (forceFollowUp || canAskFollowUp(before, q));
      const root = q.parentId ?? q.id;

      const stageTimers = [
        setTimeout(() => runRef.current === run && dispatch({ type: "STAGE", stage: "thinking" }), 450),
        setTimeout(() => runRef.current === run && dispatch({ type: "STAGE", stage: "analyzing" }), 1500),
      ];
      try {
        const minThink = delay(1900);
        const analysisP = provider.analyzeAnswer(ctxBefore, turn);
        const followP = wantFollowUp ? provider.generateFollowUp(buildContext(before), turn, threadDepth(before, q)) : null;
        const mainP = !last && !wantFollowUp ? nextMainQuestion(before) : null;
        const [analysis, follow, main] = await Promise.all([analysisP, followP, mainP, minThink]);
        if (runRef.current !== run) return;
        dispatch({ type: "ANALYZED", questionId: q.id, analysis, score: answerScore(analysis), source: provider.kind });

        if (last) {
          await say(analysis.reaction, run);
          if (runRef.current === run) await complete(false, run);
          return;
        }

        let next: NextQuestion | null = main;
        let decision = follow;
        if (forceFollowUp && decision && (!decision.needed || isDuplicateQuestion(decision.question, ctxBefore.askedQuestions))) {
          decision = await mockRef.current.generateFollowUp(ctxBefore, turn, 0);
          if (!decision.needed) {
            const ko = before.config.language === "ko";
            decision = { needed: true, type: "deep_dive", anchor: "", reason: "debug", question: ko ? "방금 말씀하신 내용을 조금 더 구체적으로 설명해주시겠어요?" : "Could you go into a bit more detail on that?" };
          }
        }
        if (decision?.needed && !isDuplicateQuestion(decision.question, ctxBefore.askedQuestions)) {
          next = {
            gen: { question: decision.question, type: decision.type, intent: decision.reason },
            isFollowUp: true,
            parentId: root,
            reason: decision.reason,
            anchor: decision.anchor,
            source: provider.kind,
          };
        }
        next ??= await nextMainQuestion(stateRef.current.interview!);
        if (runRef.current !== run) return;

        dispatch({ type: "TRANSITION", kind: next.isFollowUp ? "FOLLOW_UP" : "NEXT_QUESTION", text: analysis.reaction });
        await say(analysis.reaction, run);
        if (runRef.current !== run) return;
        await present(next, run, analysis.reaction);
      } catch (err) {
        if (runRef.current !== run) return;
        fail(err, () => {
          dispatch({ type: "RECOVER" });
          dispatch({ type: "STAGE", stage: "thinking" });
          void processRef.current(q, answer, run);
        });
      } finally {
        stageTimers.forEach(clearTimeout);
      }
    },
    [complete, dispatch, fail, nextMainQuestion, present, say],
  );

  /* ─────────────────────────── public actions ─────────────────────────── */

  const openSetup = useCallback(() => {
    runRef.current++;
    cancelSpeech();
    dispatch({ type: "OPEN_SETUP" });
  }, [dispatch]);

  const start = useCallback(
    (config: InterviewConfig) => {
      runRef.current++;
      setVoice(config.voiceEnabled);
      setFallbackActive(false);
      if (status) {
        providerRef.current = createProvider(status.mode, status.model, onUsage);
        setProviderLabel(providerRef.current.label);
      }
      const interview: Interview = {
        id: createId("iv"),
        createdAt: Date.now(),
        config,
        questions: [],
        overallScore: null,
        categoryScores: null,
        report: null,
        duration: 0,
        completed: false,
        endedEarly: false,
        providers: [],
      };
      dispatch({ type: "START", interview });
      // Prefetch the opening question while the intro sequence plays.
      firstQuestionRef.current = nextMainQuestion(interview);
      firstQuestionRef.current.catch(() => undefined);
    },
    [dispatch, nextMainQuestion, onUsage, setVoice, status],
  );

  const onIntroDone = useCallback(async () => {
    const run = runRef.current;
    const pending = firstQuestionRef.current;
    if (!pending) return;
    firstQuestionRef.current = null;
    try {
      const first = await pending;
      if (runRef.current !== run) return;
      await present(first, run);
    } catch (err) {
      if (runRef.current !== run) return;
      fail(err, () => {
        dispatch({ type: "RECOVER" });
        firstQuestionRef.current = nextMainQuestion(stateRef.current.interview!);
        void introRef.current();
      });
    }
  }, [dispatch, fail, nextMainQuestion, present]);

  useEffect(() => {
    processRef.current = processAnswer;
    introRef.current = onIntroDone;
  }, [processAnswer, onIntroDone]);

  const submitAnswer = useCallback(
    (text: string, mode: "text" | "voice") => {
      const s = stateRef.current;
      const q = currentQuestion(s);
      const answer = text.trim();
      if (!q || q.answer || !answer || (s.phase !== "LISTENING" && s.phase !== "ASKING")) return;
      cancelSpeech();
      setSpeaking(false);
      const durationSec = s.questionStartedAt ? Math.round((Date.now() - s.questionStartedAt) / 1000) : 0;
      dispatch({ type: "SUBMIT", questionId: q.id, answer, mode, durationSec });
      void processAnswer(q, answer, runRef.current);
    },
    [dispatch, processAnswer],
  );

  const endInterview = useCallback(() => {
    const run = ++runRef.current;
    const answeredCount = stateRef.current.interview?.questions.filter((q) => q.feedback).length ?? 0;
    if (!answeredCount) {
      cancelSpeech();
      dispatch({ type: "OPEN_SETUP" });
      return;
    }
    void complete(true, run);
  }, [complete, dispatch]);

  const retry = useCallback(() => {
    const r = retryRef.current;
    retryRef.current = null;
    r?.();
  }, []);

  const continueWithMock = useCallback(() => {
    switchToMock();
    retry();
  }, [retry, switchToMock]);

  const reset = useCallback(() => {
    runRef.current++;
    cancelSpeech();
    setSpeaking(false);
    dispatch({ type: "RESET" });
  }, [dispatch]);

  const viewInterview = useCallback(
    (i: Interview) => {
      runRef.current++;
      cancelSpeech();
      dispatch({ type: "VIEW_RESULT", interview: i });
    },
    [dispatch],
  );

  /* ─────────────────────────── debug actions ─────────────────────────── */

  const debug = {
    nextQuestion: useCallback(async () => {
      const s = stateRef.current;
      if (s.phase !== "LISTENING" && s.phase !== "ASKING") return;
      const run = ++runRef.current;
      cancelSpeech();
      dispatch({ type: "DROP_CURRENT" });
      try {
        const next = await nextMainQuestion(stateRef.current.interview!);
        if (runRef.current === run) await present(next, run);
      } catch (err) {
        fail(err, () => dispatch({ type: "RECOVER" }));
      }
    }, [dispatch, fail, nextMainQuestion, present]),
    triggerFollowUp: useCallback(() => {
      forceFollowUpRef.current = true;
    }, []),
    simulateAnswer: useCallback(
      (kind: "excellent" | "poor") => {
        const i = stateRef.current.interview;
        if (i) submitAnswer(SAMPLE_ANSWERS[kind][i.config.language], "text");
      },
      [submitAnswer],
    ),
    completeNow: endInterview,
    testVoice: useCallback(() => {
      const lang = stateRef.current.interview ? speechLang(stateRef.current.interview.config) : "ko-KR";
      void speak(lang.startsWith("ko") ? "안녕하세요. 면접관 알렉스입니다. 음성이 잘 들리시나요?" : "Hi, I'm Alex, your interviewer. Can you hear me?", lang);
    }, []),
    testError: useCallback(() => injectFailure(1), []),
  };

  useEffect(() => () => cancelSpeech(), []);

  return {
    state,
    status,
    fallbackActive,
    tokens,
    storageOk,
    voiceOn,
    speaking,
    providerLabel,
    actions: {
      openSetup,
      start,
      onIntroDone,
      submitAnswer,
      endInterview,
      retry,
      continueWithMock,
      reset,
      viewInterview,
      setVoice,
      skipSpeaking,
    },
    debug,
  };
}

export type InterviewController = ReturnType<typeof useInterview>;
