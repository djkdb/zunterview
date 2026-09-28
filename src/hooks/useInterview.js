/**
 * Interview orchestrator. Owns the state machine and runs the conversation:
 * ask → listen → analyze (+ follow-up decision in parallel) → react → ask …
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { buildPanel, seatFor } from "../config/panel";
import { SAMPLE_ANSWERS } from "../config/sampleAnswers";
import { getCompany } from "../../shared/companies";
import { similarity } from "../utils/fingerprint";
import { AIRequestError } from "../services/ai/AIProvider";
import { injectFailure } from "../services/ai/faults";
import { MockAIProvider } from "../services/ai/MockAIProvider";
import { createProvider, detectProviderStatus } from "../services/ai/providerFactory";
import { cancelLine, isVoiceOutputAvailable, speakLine } from "../services/speech/tts";
import { currentQuestion, initialState, reducer } from "../state/interviewMachine";
import { buildContext, toAIConfig, toCurrentTurn } from "../utils/context";
import { isDuplicateQuestion } from "../utils/fingerprint";
import { createId, delay } from "../utils/id";
import { canAskFollowUp, isLastQuestion, threadDepth } from "../utils/policy";
import { answerScore, strongestAndWeakest } from "../utils/scoring";
import { clearActiveInterview, saveActiveInterview, saveInterview } from "../utils/storage";
const speechLang = (c) => (c.language === "ko" ? "ko-KR" : "en-US");
export function useInterview() {
    const [state, setState] = useState(initialState);
    const stateRef = useRef(initialState);
    const dispatch = useCallback((a) => {
        stateRef.current = reducer(stateRef.current, a);
        setState(stateRef.current);
    }, []);
    const [status, setStatus] = useState(null);
    const [fallbackActive, setFallbackActive] = useState(false);
    const [tokens, setTokens] = useState({ calls: 0, inputTokens: 0, outputTokens: 0, lastModel: null });
    const [storageOk, setStorageOk] = useState(true);
    const [voiceOn, setVoiceOn] = useState(true);
    const voiceRef = useRef(true);
    const [speaking, setSpeaking] = useState(false);
    const [providerLabel, setProviderLabel] = useState("Mock Interviewer");
    const providerRef = useRef(new MockAIProvider());
    const mockRef = useRef(new MockAIProvider());
    const runRef = useRef(0);
    const firstQuestionRef = useRef(null);
    const retryRef = useRef(null);
    // Indirection so retry closures can re-enter these async flows.
    const processRef = useRef(async () => undefined);
    const introRef = useRef(async () => undefined);
    const forceFollowUpRef = useRef(false);
    const forceNextRef = useRef(false);
    const onUsage = useCallback((u) => {
        setTokens((t) => ({ calls: t.calls + 1, inputTokens: t.inputTokens + u.inputTokens, outputTokens: t.outputTokens + u.outputTokens, lastModel: u.model }));
    }, []);
    /* ─────────────────────────── provider mode ─────────────────────────── */
    useEffect(() => {
        let alive = true;
        detectProviderStatus().then((s) => {
            if (!alive)
                return;
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
    const say = useCallback(async (text, run, seat = "center", force = false) => {
        const i = stateRef.current.interview;
        if (!i)
            return;
        if ((voiceRef.current || force) && isVoiceOutputAvailable()) {
            setSpeaking(true);
            const v = buildPanel(i.config.position)[seat].voice;
            // Even if the browser's speech engine fails instantly, give people time to read the line.
            await Promise.all([speakLine(text, { voice: seat, lang: speechLang(i.config), pitch: v.pitch, rate: v.rate, voiceIndex: v.index }), force ? null : delay(Math.min(1500, 500 + text.length * 12))]);
            if (runRef.current === run)
                setSpeaking(false);
        }
        else {
            // Give the reader time proportional to the text (short, never sluggish).
            if (!force)
                await delay(Math.min(1700, 650 + text.length * 14));
        }
    }, []);
    const setVoice = useCallback((on) => {
        voiceRef.current = on;
        setVoiceOn(on);
        if (!on) {
            cancelLine();
            setSpeaking(false);
        }
    }, []);
    const skipSpeaking = useCallback(() => {
        cancelLine();
        setSpeaking(false);
    }, []);
    /* ─────────────────────────── question flow ─────────────────────────── */
    const fail = useCallback((err, retry) => {
        const kind = err instanceof AIRequestError ? err.kind : "unknown";
        const message = err instanceof Error ? err.message : "Something went wrong.";
        retryRef.current = retry;
        cancelLine();
        setSpeaking(false);
        dispatch({ type: "FAIL", error: { kind, message } });
    }, [dispatch]);
    /** Generates a main question, guarding against repeats (retry once, then mock bank). */
    const nextMainQuestion = useCallback(async (interview) => {
        const ctx = buildContext(interview);
        const provider = providerRef.current;
        let gen = await provider.generateQuestion(ctx);
        let source = provider.kind;
        if (isDuplicateQuestion(gen.question, ctx.askedQuestions)) {
            gen = await provider.generateQuestion(ctx);
            if (isDuplicateQuestion(gen.question, ctx.askedQuestions)) {
                gen = await mockRef.current.generateQuestion(ctx);
                source = "mock";
            }
        }
        return { gen, isFollowUp: false, parentId: null, source };
    }, []);
    const present = useCallback(async (next, run, reaction) => {
        const question = {
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
        const company = getCompany(stateRef.current.interview?.config.companyId);
        if (company && !question.isFollowUp) {
            const match = company.questions.find((q) => similarity(q.text, question.text) >= 0.55);
            if (match)
                question.origin = match.basis;
        }
        dispatch({ type: "QUESTION", question, now: Date.now() });
        const seat = seatFor(question.type, question.isFollowUp);
        // First question: the panel chair greets the candidate, as in a real interview.
        if (reaction && stateRef.current.interview?.questions.length === 1)
            await say(reaction, run, "center");
        if (runRef.current !== run)
            return;
        await say(question.text, run, seat);
        if (runRef.current === run)
            dispatch({ type: "LISTEN", now: Date.now() });
    }, [dispatch, say]);
    const complete = useCallback(async (endedEarly, run) => {
        cancelLine();
        setSpeaking(false);
        dispatch({ type: "COMPLETE", endedEarly, now: Date.now() });
        const lang = stateRef.current.interview?.config.language;
        if (voiceRef.current && stateRef.current.interview?.questions.length) {
            void say(lang === "en" ? "That concludes our interview. Thank you for your time." : "이상으로 면접을 마치겠습니다. 수고 많으셨습니다.", run, "center");
        }
        const i = stateRef.current.interview;
        if (!i.questions.length || !i.categoryScores || i.overallScore === null) {
            dispatch({ type: "OPEN_SETUP" });
            return;
        }
        const { strongest, weakest } = strongestAndWeakest(i.categoryScores);
        const req = {
            config: toAIConfig(i),
            turns: i.questions.map((q) => ({
                question: q.text.slice(0, 600),
                type: q.type,
                isFollowUp: q.isFollowUp,
                answerExcerpt: (q.answer ?? "").slice(0, 800),
                score: q.score ?? 0,
                strength: q.feedback.strength.slice(0, 400),
                improve: q.feedback.improve.slice(0, 400),
            })),
            computed: { overall: i.overallScore, categoryScores: i.categoryScores, strongest, weakest },
        };
        const minShow = delay(2200);
        let report;
        let source = providerRef.current.kind;
        try {
            report = await providerRef.current.generateFinalReport(req);
        }
        catch {
            // The report must never block the result screen — fall back to the mock writer.
            report = await mockRef.current.generateFinalReport(req);
            source = "mock";
        }
        await minShow;
        if (runRef.current !== run)
            return;
        dispatch({ type: "REPORT", report, source });
        setStorageOk(saveInterview(stateRef.current.interview));
    }, [dispatch, say]);
    const processAnswer = useCallback(async (q, answer, run) => {
        const before = stateRef.current.interview;
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
            if (runRef.current !== run)
                return;
            dispatch({ type: "ANALYZED", questionId: q.id, analysis, score: answerScore(analysis), source: provider.kind });
            const askedBy = seatFor(q.type, q.isFollowUp);
            if (last) {
                await say(analysis.reaction, run, askedBy);
                if (runRef.current === run)
                    await complete(false, run);
                return;
            }
            let next = main;
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
            next ??= await nextMainQuestion(stateRef.current.interview);
            if (runRef.current !== run)
                return;
            dispatch({ type: "TRANSITION", kind: next.isFollowUp ? "FOLLOW_UP" : "NEXT_QUESTION", text: analysis.reaction });
            await say(analysis.reaction, run, askedBy);
            if (runRef.current !== run)
                return;
            await present(next, run, analysis.reaction);
        }
        catch (err) {
            if (runRef.current !== run)
                return;
            fail(err, () => {
                dispatch({ type: "RECOVER" });
                dispatch({ type: "STAGE", stage: "thinking" });
                void processRef.current(q, answer, run);
            });
        }
        finally {
            stageTimers.forEach(clearTimeout);
        }
    }, [complete, dispatch, fail, nextMainQuestion, present, say]);
    /* ─────────────────────────── persistence ─────────────────────────── */
    // Keep the in-progress interview in storage; warn before leaving the page mid-interview.
    useEffect(() => {
        const active = ["ASKING", "LISTENING", "ANALYZING", "FOLLOW_UP", "NEXT_QUESTION", "ERROR"].includes(state.phase);
        const i = state.interview;
        if (active && i && i.questions.length) {
            const elapsedSec = state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : 0;
            saveActiveInterview({ interview: i, elapsedSec, savedAt: Date.now() });
        }
        else if (["COMPLETED", "RESULT", "SETUP", "INTRO"].includes(state.phase)) {
            clearActiveInterview();
        }
        if (!active)
            return;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [state.phase, state.interview, state.startedAt]);
    /* ─────────────────────────── public actions ─────────────────────────── */
    const openSetup = useCallback(() => {
        runRef.current++;
        cancelLine();
        dispatch({ type: "OPEN_SETUP" });
    }, [dispatch]);
    const start = useCallback((config) => {
        runRef.current++;
        setVoice(config.voiceEnabled);
        setFallbackActive(false);
        if (status) {
            providerRef.current = createProvider(status.mode, status.model, onUsage);
            setProviderLabel(providerRef.current.label);
        }
        const interview = {
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
    }, [dispatch, nextMainQuestion, onUsage, setVoice, status]);
    const onIntroDone = useCallback(async () => {
        const run = runRef.current;
        const pending = firstQuestionRef.current;
        if (!pending)
            return;
        firstQuestionRef.current = null;
        try {
            const first = await pending;
            if (runRef.current !== run)
                return;
            const ko = stateRef.current.interview?.config.language !== "en";
            await present(first, run, ko ? "반갑습니다. 편하게 앉으세요. 지금부터 면접을 시작하겠습니다." : "Welcome, please have a seat. Let's begin the interview.");
        }
        catch (err) {
            if (runRef.current !== run)
                return;
            fail(err, () => {
                dispatch({ type: "RECOVER" });
                firstQuestionRef.current = nextMainQuestion(stateRef.current.interview);
                void introRef.current();
            });
        }
    }, [dispatch, fail, nextMainQuestion, present]);
    useEffect(() => {
        processRef.current = processAnswer;
        introRef.current = onIntroDone;
    }, [processAnswer, onIntroDone]);
    const submitAnswer = useCallback((text, mode) => {
        const s = stateRef.current;
        const q = currentQuestion(s);
        const answer = text.trim();
        if (!q || q.answer || !answer || (s.phase !== "LISTENING" && s.phase !== "ASKING"))
            return;
        cancelLine();
        setSpeaking(false);
        const durationSec = s.questionStartedAt ? Math.round((Date.now() - s.questionStartedAt) / 1000) : 0;
        dispatch({ type: "SUBMIT", questionId: q.id, answer, mode, durationSec });
        void processAnswer(q, answer, runRef.current);
    }, [dispatch, processAnswer]);
    const endInterview = useCallback(() => {
        const run = ++runRef.current;
        const answeredCount = stateRef.current.interview?.questions.filter((q) => q.feedback).length ?? 0;
        if (!answeredCount) {
            cancelLine();
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
    /** Continue an interview saved before a refresh / closed tab. */
    const resume = useCallback(async (saved) => {
        const run = ++runRef.current;
        setVoice(saved.interview.config.voiceEnabled);
        if (status) {
            providerRef.current = createProvider(status.mode, status.model, onUsage);
            setProviderLabel(providerRef.current.label);
        }
        dispatch({ type: "RESTORE", interview: saved.interview, elapsedSec: saved.elapsedSec, now: Date.now() });
        const s = stateRef.current;
        const last = currentQuestion(s);
        if (s.phase === "LISTENING") {
            const ko = s.interview.config.language !== "en";
            await say(ko ? `다시 여쭤보겠습니다. ${last.text}` : `Let me ask again. ${last.text}`, run, seatFor(last.type, last.isFollowUp));
        }
        else if (s.phase === "ANALYZING") {
            void processRef.current(last, last.answer, run);
        }
        else if (isLastQuestion(s.interview)) {
            await complete(false, run);
        }
        else {
            try {
                const next = await nextMainQuestion(s.interview);
                if (runRef.current === run)
                    await present(next, run);
            }
            catch (err) {
                const retryNext = () => {
                    dispatch({ type: "RECOVER" });
                    nextMainQuestion(stateRef.current.interview)
                        .then((next) => present(next, runRef.current))
                        .catch((e) => fail(e, retryNext));
                };
                fail(err, retryNext);
            }
        }
    }, [complete, dispatch, fail, nextMainQuestion, onUsage, present, say, setVoice, status]);
    /** "다시 한번 말씀해 주시겠어요?" — replay the current question aloud. */
    const repeatQuestion = useCallback(() => {
        const q = currentQuestion(stateRef.current);
        if (!q || q.answer)
            return;
        void say(q.text, runRef.current, seatFor(q.type, q.isFollowUp), true);
    }, [say]);
    const reset = useCallback(() => {
        runRef.current++;
        cancelLine();
        setSpeaking(false);
        dispatch({ type: "RESET" });
    }, [dispatch]);
    const viewInterview = useCallback((i) => {
        runRef.current++;
        cancelLine();
        dispatch({ type: "VIEW_RESULT", interview: i });
    }, [dispatch]);
    /* ─────────────────────────── debug actions ─────────────────────────── */
    const debug = {
        nextQuestion: useCallback(async () => {
            const s = stateRef.current;
            if (s.phase !== "LISTENING" && s.phase !== "ASKING")
                return;
            const run = ++runRef.current;
            cancelLine();
            dispatch({ type: "DROP_CURRENT" });
            try {
                const next = await nextMainQuestion(stateRef.current.interview);
                if (runRef.current === run)
                    await present(next, run);
            }
            catch (err) {
                fail(err, () => dispatch({ type: "RECOVER" }));
            }
        }, [dispatch, fail, nextMainQuestion, present]),
        triggerFollowUp: useCallback(() => {
            forceFollowUpRef.current = true;
        }, []),
        simulateAnswer: useCallback((kind) => {
            const i = stateRef.current.interview;
            if (i)
                submitAnswer(SAMPLE_ANSWERS[kind][i.config.language], "text");
        }, [submitAnswer]),
        completeNow: endInterview,
        testVoice: useCallback(() => {
            const lang = stateRef.current.interview ? speechLang(stateRef.current.interview.config) : "ko-KR";
            void speakLine(lang.startsWith("ko") ? "안녕하세요. 면접위원장 김도윤입니다. 음성이 잘 들리시나요?" : "Hello, I'm the panel chair. Can you hear me clearly?", { voice: "center", lang });
        }, []),
        testError: useCallback(() => injectFailure(1), []),
    };
    useEffect(() => () => cancelLine(), []);
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
            resume,
            repeatQuestion,
            setVoice,
            skipSpeaking,
        },
        debug,
    };
}
