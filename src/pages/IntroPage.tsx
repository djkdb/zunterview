import { useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { MicIcon } from "../components/ui/icons";
import { SpeechHabits } from "../components/SpeechHabits";
import { ScoreRing } from "../components/ScoreRing";
import { DEFAULT_CONFIG } from "../config/options";
import { useElapsed } from "../hooks/useTimer";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { createProvider, type ProviderStatus } from "../services/ai/providerFactory";
import { MockAIProvider } from "../services/ai/MockAIProvider";
import { track } from "../services/events";
import { CATEGORY_KEYS, LIMITS, type AnswerAnalysis, type InterviewContext } from "../../shared/schemas";
import { speechHabits } from "../../shared/speechHabits";
import { INTRO_QUESTION, INTRO_TARGET, introChecks, timeVerdict, type IntroAttempt } from "../utils/intro";
import { noteKey } from "../utils/notebook";
import { mmss, shortDate } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { TONE_TEXT } from "../utils/tones";
import { loadHistory, loadInterview, loadIntroAttempts, loadLastConfig, saveIntroAttempt, saveScript } from "../utils/storage";
import { PRIVACY_VERSION } from "./LegalPage";

const CONSENT_KEY = "interview-ai:consent";

interface Props {
  status: ProviderStatus | null;
  onHome: () => void;
  onNotes: () => void;
  onStart: () => void;
}

/** The job and settings to judge the introduction against: the last setup, or the latest interview. */
function baseConfig() {
  const last = loadLastConfig();
  const latest = loadHistory()[0];
  const fromInterview = latest ? loadInterview(latest.id)?.config : undefined;
  return { ...DEFAULT_CONFIG, ...(fromInterview ?? {}), ...(last ?? {}) };
}

const VERDICT = {
  short: { label: "짧음", tone: "text-warn", note: `목표(${INTRO_TARGET.min}~${INTRO_TARGET.max}초)보다 짧습니다. 대표 경험을 한 문장 더 넣어도 됩니다.` },
  good: { label: "적당", tone: "text-good", note: `목표(${INTRO_TARGET.min}~${INTRO_TARGET.max}초) 안에 들어왔습니다.` },
  long: { label: "김", tone: "text-warn", note: `목표(${INTRO_TARGET.min}~${INTRO_TARGET.max}초)를 넘었습니다. 경험은 하나만 남기고 나머지는 꼬리질문에서 말해도 됩니다.` },
} as const;

/** 1분 자기소개 연습: say it (or type it and read it aloud on the timer), get it scored, try again. */
export function IntroPage({ status, onHome, onNotes, onStart }: Props) {
  const [config] = useState(baseConfig);
  const [position, setPosition] = useState(config.position);
  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ analysis: AnswerAnalysis; score: number; seconds: number | null; text: string; by: "ai" | "mock" } | null>(null);
  const [attempts, setAttempts] = useState<IntroAttempt[]>(loadIntroAttempts);
  const [savedNote, setSavedNote] = useState(false);
  const [consented, setConsented] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === PRIVACY_VERSION;
    } catch {
      return false;
    }
  });
  const timing = startedAt !== null;
  const elapsed = useElapsed(startedAt, timing);

  const startTimer = () => {
    setStartedAt(Date.now());
    setSeconds(null);
  };
  const stopTimer = () => {
    if (startedAt !== null) setSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    setStartedAt(null);
  };
  const voice = useVoiceInput("ko-KR", (t) => setText((prev) => (prev ? `${prev} ${t}` : t).slice(0, LIMITS.answer)));
  const toggleVoice = () => {
    if (voice.recording) {
      voice.stop();
      stopTimer();
    } else {
      voice.start();
      startTimer();
    }
  };

  const useAI = status?.mode === "ai" && consented;
  const live = useMemo(() => (text.trim() ? introChecks(text, position) : []), [text, position]);
  const chars = text.replace(/\s/g, "").length;

  const evaluate = async () => {
    if (!text.trim() || busy) return;
    if (voice.recording) voice.stop();
    if (timing) stopTimer();
    setBusy(true);
    setSavedNote(false);
    const measured = timing ? Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)) : seconds;
    const ctx: InterviewContext = {
      config: {
        position: position.trim() || config.position || "신입",
        experience: config.experience,
        interviewType: "mixed",
        difficulty: config.difficulty,
        questionLimit: 1,
        jobDescription: "",
        persona: config.persona,
        language: "ko",
        ...(config.roleId && position === config.position ? { roleId: config.roleId } : {}),
      },
      progress: { asked: 1, total: 1, followUps: 0 },
      history: [],
      askedQuestions: [INTRO_QUESTION],
      usedTypes: ["opening"],
    };
    const turn = { question: INTRO_QUESTION, type: "opening" as const, isFollowUp: false, answer: text.trim() };
    let analysis: AnswerAnalysis;
    let by: "ai" | "mock" = "mock";
    try {
      if (useAI) {
        try {
          localStorage.setItem(CONSENT_KEY, PRIVACY_VERSION);
        } catch {
          /* consent is asked again next time */
        }
        analysis = await createProvider("ai", status?.model ?? null).analyzeAnswer(ctx, turn);
        by = "ai";
      } else {
        analysis = await new MockAIProvider().analyzeAnswer(ctx, turn);
      }
    } catch {
      // The AI couldn't answer (limit, network): the mock interviewer scores it instead.
      analysis = await new MockAIProvider().analyzeAnswer(ctx, turn);
      by = "mock";
    }
    const score = Math.round(CATEGORY_KEYS.reduce((s, k) => s + analysis.scores[k].score, 0) / CATEGORY_KEYS.length);
    const attempt: IntroAttempt = { at: Date.now(), text: text.trim(), seconds: measured ?? null, score, position: ctx.config.position };
    saveIntroAttempt(attempt);
    setAttempts(loadIntroAttempts());
    setResult({ analysis, score, seconds: measured ?? null, text: text.trim(), by });
    setSeconds(measured ?? null);
    setBusy(false);
    track("intro_practiced", { mode: by, timed: measured !== null, verdict: timeVerdict(measured ?? null) ?? "none" });
    window.requestAnimationFrame(() => document.getElementById("intro-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const previous = result ? attempts.find((a) => a.at < attempts[0].at) : undefined;
  const verdict = result ? timeVerdict(result.seconds) : null;
  const habits = result ? speechHabits([{ no: 1, text: result.text }]) : null;
  const checks = result ? introChecks(result.text, position) : live;

  return (
    <div className="min-h-dvh pb-20">
      <TopBar
        onHome={onHome}
        right={
          <>
            <Button size="sm" variant="ghost" onClick={onNotes}>
              답변 노트
            </Button>
            <Button size="sm" variant="primary" onClick={onStart}>
              면접 보기
            </Button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-6xl">
        <div className="pt-8 pb-5">
          <p className="text-sm font-semibold text-accent">1분 자기소개 연습</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-navy">첫 질문만 집중해서 다듬기</h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
            자기소개만 따로 연습합니다. 말로 하거나, 써 둔 글을 소리 내어 읽으면서 시간을 재세요. 면접 때와 같은 면접관이 채점하고, 시간과 구성, 말버릇을 바로 보여 줍니다.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <label className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                지원 직무
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value.slice(0, LIMITS.position))}
                  placeholder="예: 백엔드 개발자"
                  className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-[14px] text-ink focus:border-accent focus:outline-none"
                />
              </label>
              <p className="mt-4 text-[17px] font-bold text-navy">“{INTRO_QUESTION}”</p>
              <textarea
                id="intro-answer"
                aria-label="자기소개"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, LIMITS.answer))}
                rows={7}
                placeholder="말로 하려면 [말로 하기]를 누르세요. 글로 써 두었다면 붙여넣고 [소리 내어 읽기]로 시간을 재세요."
                className="mt-3 w-full resize-y rounded-lg border border-line-strong bg-surface-2/40 px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent focus:bg-surface"
              />
              {voice.interim && <p className="mt-1 text-[13px] text-faint">{voice.interim}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {voice.supported && (
                  <Button size="sm" variant={voice.recording ? "danger" : "secondary"} onClick={toggleVoice} icon={<MicIcon width={15} height={15} />}>
                    {voice.recording ? "말하기 끝" : "말로 하기"}
                  </Button>
                )}
                {!voice.recording && (
                  <Button size="sm" variant="secondary" onClick={timing ? stopTimer : startTimer} disabled={!text.trim() && !timing}>
                    {timing ? "읽기 끝" : "소리 내어 읽기"}
                  </Button>
                )}
                <span className="ml-auto flex items-center gap-2 tabular-nums text-[14px]" aria-live="polite">
                  <TimeBar seconds={timing ? elapsed : (seconds ?? 0)} />
                  <b className={timing ? (elapsed > INTRO_TARGET.max ? "text-warn" : "text-ink") : "text-muted"}>{mmss(timing ? elapsed : (seconds ?? 0))}</b>
                </span>
              </div>
              {voice.error && <p className="mt-2 text-[12px] text-warn">마이크를 쓸 수 없습니다. 글로 쓰고 [소리 내어 읽기]로 시간을 재세요.</p>}
              <p className="mt-2 text-[12px] text-faint">
                공백 빼고 {chars}자. 마이크는 [말로 하기]를 누른 동안에만 켜집니다. 시간을 재지 않으면 시간 평가는 빠집니다.
              </p>
              {status?.mode === "ai" && (
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-[12px] leading-relaxed text-ink">
                  <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
                  <span>
                    AI 면접관이 채점하도록 자기소개가 Anthropic(미국)으로 전송되는 데 동의합니다. 서버에는 저장하지 않습니다. 동의하지 않으면 MOCK 면접관이 채점합니다.{" "}
                    <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
                      개인정보처리방침
                    </a>
                  </span>
                </label>
              )}
              <Button variant="primary" className="mt-4 w-full sm:w-auto sm:px-10" disabled={!text.trim() || busy} onClick={evaluate}>
                {busy ? "채점하는 중…" : "채점받기"}
              </Button>
            </section>

            {result && (
              <section id="intro-result" className="scroll-mt-20 rounded-xl border border-line bg-surface p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-5">
                  <ScoreRing score={result.score} size={112} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-faint">{result.by === "ai" ? "AI 면접관" : "MOCK 면접관"} 채점</p>
                    {previous && (
                      <p className="text-[13px] text-muted">
                        지난 시도 {previous.score}점에서{" "}
                        <b className={result.score > previous.score ? "text-good" : result.score < previous.score ? "text-warn" : "text-muted"}>
                          {result.score - previous.score >= 0 ? "+" : ""}
                          {result.score - previous.score}
                        </b>
                      </p>
                    )}
                    <p className="mt-1.5 text-[14px] text-ink">
                      시간{" "}
                      {verdict ? (
                        <>
                          <b className="tabular-nums">{result.seconds}초</b> <b className={VERDICT[verdict].tone}>({VERDICT[verdict].label})</b>
                          <span className="block text-[13px] text-muted">{VERDICT[verdict].note}</span>
                        </>
                      ) : (
                        <span className="text-muted">재지 않음. 다음에는 소리 내어 읽으며 재 보세요.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-good/25 bg-good/[0.05] px-3 py-2.5 text-[14px] leading-relaxed">
                    <p className="text-[12px] font-semibold text-good">잘한 점</p>
                    {result.analysis.strength}
                  </div>
                  <div className="rounded-lg border border-warn/25 bg-warn/[0.05] px-3 py-2.5 text-[14px] leading-relaxed">
                    <p className="text-[12px] font-semibold text-warn">고칠 점</p>
                    {result.analysis.improve}
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  <span className="text-faint">이렇게 바꿔 보세요(참고용):</span> <i>{result.analysis.betterAnswer.example}</i>
                </p>

                {habits && (
                  <div className="mt-5">
                    <h2 className="mb-2 text-[14px] font-bold text-navy">말버릇</h2>
                    <SpeechHabits habits={habits} />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setResult(null);
                      setSeconds(null);
                      document.getElementById("intro-answer")?.focus();
                    }}
                  >
                    고쳐서 다시 하기
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={savedNote}
                    onClick={() => {
                      setSavedNote(saveScript(noteKey(INTRO_QUESTION), INTRO_QUESTION, result.text));
                      track("note_written");
                    }}
                  >
                    {savedNote ? "답변 노트에 저장했습니다" : "답변 노트에 저장"}
                  </Button>
                </div>
              </section>
            )}
          </div>

          <aside className="mt-4 space-y-4 lg:sticky lg:top-20 lg:mt-0">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[14px] font-bold text-navy">{result ? "구성 점검" : "이렇게 구성해 보세요"}</h2>
              <ol className="mt-2 space-y-2">
                {(checks.length ? checks : introChecks("", position)).map((c, idx) => (
                  <li key={c.key} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        !text.trim() && !result ? "bg-surface-3 text-muted" : c.ok ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
                      }`}
                      aria-hidden
                    >
                      {!text.trim() && !result ? idx + 1 : c.ok ? "✓" : "!"}
                    </span>
                    <span>
                      <b className="text-ink">{c.label}</b>
                      {(text.trim() || result) && <span className="block break-keep text-muted">{c.ok && c.key !== "role" ? c.note : c.ok ? "직무와 이어지는 말이 있습니다." : c.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {attempts.length > 0 && (
              <section className="rounded-xl border border-line bg-surface p-4">
                <h2 className="text-[14px] font-bold text-navy">지난 시도</h2>
                <ol className="mt-2 divide-y divide-line">
                  {attempts.slice(0, 8).map((a) => (
                    <li key={a.at}>
                      <button
                        type="button"
                        onClick={() => {
                          setText(a.text);
                          setResult(null);
                          setSeconds(null);
                        }}
                        className="flex w-full items-center gap-3 py-2 text-left text-[13px] hover:text-ink"
                        title="이 시도의 글을 불러와 고칩니다"
                      >
                        <span className={`w-8 tabular-nums font-bold ${TONE_TEXT[scoreTone(a.score)]}`}>{a.score}</span>
                        <span className="tabular-nums text-muted">{a.seconds ? `${a.seconds}초` : "시간 없음"}</span>
                        <span className="ml-auto text-faint">{shortDate(a.at)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-[11px] text-faint">누르면 그 글을 불러와 고칠 수 있습니다. 이 브라우저에만 저장됩니다.</p>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/** One minute as a bar, with the target band marked. */
function TimeBar({ seconds }: { seconds: number }) {
  const max = 90;
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <span className="relative hidden h-2 w-32 overflow-hidden rounded-full bg-surface-3 sm:inline-block" aria-hidden>
      <span className="absolute inset-y-0 bg-good/25" style={{ left: pct(INTRO_TARGET.min), width: `calc(${pct(INTRO_TARGET.max)} - ${pct(INTRO_TARGET.min)})` }} />
      <span className={`absolute inset-y-0 left-0 rounded-full ${seconds > INTRO_TARGET.max ? "bg-warn" : "bg-accent"}`} style={{ width: pct(seconds) }} />
    </span>
  );
}
