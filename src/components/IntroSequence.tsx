import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DIFFICULTY_KO, INTERVIEW_TYPE_KO } from "../config/labelsKo";
import { isVoiceOutputAvailable, speakLine } from "../services/speech/tts";
import type { InterviewConfig } from "../types/interview";
import { getCompany } from "../../shared/companies";

interface Props {
  config: InterviewConfig;
  applicantNo: string;
  engineLabel: string;
  voiceInput: boolean;
  voiceOutput: boolean;
  onDone: () => void;
}

type Step = "waiting" | "call" | "door";

/**
 * 면접 대기실 → 호명 → 입실. Replaces a generic countdown with the moments
 * every Korean candidate knows (≈5.5s, skippable).
 */
export function IntroSequence({ config, applicantNo, engineLabel, voiceInput, voiceOutput, onDone }: Props) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("waiting");
  const done = useRef(false);
  const ko = config.language === "ko";
  const callText = `지원번호 ${applicantNo}번 지원자님, 제2면접실로 입실해 주세요.`;

  const finishRef = useRef(() => {});
  useEffect(() => {
    finishRef.current = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };
  });

  const speaksCall = voiceOutput && isVoiceOutputAvailable();

  useEffect(() => {
    // With voice on, the doors open only after the call has been spoken (see below).
    const schedule: [Step | "end", number][] = reduce
      ? [["call", 700], ...(speaksCall ? [] : ([["end", 1500]] as [Step | "end", number][]))]
      : [["call", 2300], ...(speaksCall ? [] : ([["door", 4500], ["end", 5500]] as [Step | "end", number][]))];
    const timers = schedule.map(([s, t]) => setTimeout(() => (s === "end" ? finishRef.current() : setStep(s)), t));
    return () => timers.forEach(clearTimeout);
  }, [reduce, speaksCall]);

  // The staff member's call is spoken aloud; neural voices take a moment to arrive, so wait for it (max 8s).
  useEffect(() => {
    if (step !== "call" || !speaksCall) return;
    let alive = true;
    const minShow = new Promise((r) => setTimeout(r, reduce ? 600 : 2000));
    const spoken = speakLine(callText, { voice: "staff", lang: "ko-KR", pitch: 1.1, voiceIndex: 1 });
    const cap = new Promise((r) => setTimeout(r, 8000));
    Promise.race([Promise.all([spoken, minShow]), cap]).then(() => {
      if (!alive) return;
      if (reduce) return finishRef.current();
      setStep("door");
    });
    return () => {
      alive = false;
    };
  }, [step, speaksCall, callText, reduce]);

  // Doors opened after the spoken call → enter the room a moment later.
  useEffect(() => {
    if (step !== "door" || !speaksCall) return;
    const t = setTimeout(() => finishRef.current(), 1000);
    return () => clearTimeout(t);
  }, [step, speaksCall]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finishRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const company = getCompany(config.companyId);
  const rows: [string, string][] = [
    ["지원번호", applicantNo],
    ...(company ? ([["지원 기업", `${company.name}${config.companyTrack && config.companyTrack !== "공통" ? ` · ${config.companyTrack}` : ""}`]] as [string, string][]) : []),
    ["지원 분야", config.position],
    ["면접 유형", `${INTERVIEW_TYPE_KO[config.interviewType]} · ${DIFFICULTY_KO[config.difficulty]}`],
    ["문항 수", `${config.questionLimit}문항${ko ? "" : " (영어 면접)"}`],
    ["면접 장소", "본관 3층 제2면접실"],
    ["면접 위원", "3인 (다대일 면접)"],
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-bg" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {step !== "door" ? (
          <motion.div key="waiting" className="flex h-full flex-col items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="mb-4 text-sm font-semibold text-muted">면접 대기실</p>
            {/* admission ticket */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md overflow-hidden rounded-xl border border-line-strong bg-surface shadow-lg"
            >
              <div className="flex items-center justify-between bg-navy px-5 py-3 text-white">
                <span className="text-[15px] font-bold">모의면접 수험표</span>
                <span className="font-mono text-[11px] tracking-[0.18em] text-white/70">INTERVIEW//AI</span>
              </div>
              <dl className="grid grid-cols-[96px_1fr] text-[14px]">
                {rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="border-b border-line bg-surface-2 px-4 py-2.5 whitespace-nowrap text-muted">{k}</dt>
                    <dd className="truncate border-b border-line px-4 py-2.5 font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="px-5 py-4 text-[13px] leading-relaxed text-muted">
                <p className="mb-1.5 font-semibold text-ink">유의사항</p>
                <ul className="space-y-1">
                  <li>· 답변은 결론부터, 두괄식으로 말해 주세요.</li>
                  <li>· 면접관이 답변 내용을 바탕으로 추가 질문(꼬리질문)을 합니다.</li>
                  <li>· {voiceInput ? "음성 답변은 [음성 답변] 버튼을 누를 때만 마이크가 켜집니다." : "이 브라우저에서는 텍스트로 답변합니다."}</li>
                </ul>
                <p className="mt-3 text-[11px] text-faint">
                  면접관: {engineLabel} · 음성 안내 {voiceOutput ? "켜짐" : "꺼짐"}
                </p>
              </div>
            </motion.div>

            <div className="mt-6 h-20 w-full max-w-md">
              <AnimatePresence mode="wait">
                {step === "waiting" ? (
                  <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-sm text-muted">
                    잠시 후 호명됩니다<span className="animate-pulse">…</span>
                  </motion.p>
                ) : (
                  <motion.div
                    key="call"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-hidden>
                      📢
                    </span>
                    <p className="text-[15px] font-semibold text-accent">{callText}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div key="door" className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* double doors swinging open into the interview room */}
            {(["left", "right"] as const).map((side) => (
              <motion.div
                key={side}
                className={`absolute top-0 h-full w-1/2 ${side === "left" ? "left-0 border-r" : "right-0 border-l"} border-[#6e513a] bg-gradient-to-b from-[#a8855f] to-[#8a6749]`}
                initial={{ x: 0 }}
                animate={{ x: side === "left" ? "-100%" : "100%" }}
                transition={{ delay: 0.25, duration: 0.8, ease: [0.6, 0, 0.3, 1] }}
              >
                <div className={`absolute top-1/2 h-16 w-2.5 -translate-y-1/2 rounded bg-[#d9c7a8] ${side === "left" ? "right-5" : "left-5"}`} />
                {side === "left" && (
                  <div className="absolute top-[18%] right-6 rounded border border-[#6e513a] bg-[#f6f1e7] px-3 py-1.5 text-sm font-bold text-[#3e2e20]">제2면접실</div>
                )}
              </motion.div>
            ))}
            <motion.p
              className="absolute inset-x-0 bottom-[20%] text-center text-lg font-bold text-ink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              면접을 시작하겠습니다
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => finishRef.current()}
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 text-[13px] text-faint hover:text-ink"
      >
        바로 입실하기 ›
      </button>
    </div>
  );
}
