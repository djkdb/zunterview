import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Copy } from "../config/copy";
import { useNow } from "../hooks/useTimer";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { mmss } from "../utils/format";
import { Button } from "./ui/Button";
import { MicIcon, SendIcon, StopIcon } from "./ui/icons";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (mode: "text" | "voice") => void;
  enabled: boolean;
  copy: Copy;
  lang: string;
  timeLimit: number;
  questionStartedAt: number | null;
  onActivity: (level: number) => void;
  /** Submit a candid "I don't know" (moves the interview on). */
  onDontKnow: () => void;
  onFocusChange?: (focused: boolean) => void;
}

export function AnswerInput({ value, onChange, onSubmit, enabled, copy, lang, timeLimit, questionStartedAt, onActivity, onDontKnow, onFocusChange }: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const usedVoice = useRef(false);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const appendFinal = useCallback(
    (t: string) => {
      usedVoice.current = true;
      const cur = valueRef.current;
      onChange(cur ? `${cur.replace(/\s+$/, "")} ${t}` : t);
    },
    [onChange],
  );
  const voice = useVoiceInput(lang, appendFinal);

  // Stop recording when input gets disabled (answer submitted / phase change).
  useEffect(() => {
    if (!enabled && voice.recording) voice.stop();
  }, [enabled, voice]);

  // Interviewer waveform reacts to the candidate "speaking" (voice) or typing.
  useEffect(() => {
    onActivity(voice.recording ? (voice.interim ? 1 : 0.5) : 0);
  }, [voice.recording, voice.interim, onActivity]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTyping = () => {
    onActivity(0.7);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onActivity(0), 600);
  };

  const now = useNow(enabled && timeLimit > 0 && questionStartedAt !== null, 500);
  const left = timeLimit > 0 && questionStartedAt ? Math.min(timeLimit, timeLimit - Math.floor(Math.max(0, now - questionStartedAt) / 1000)) : null;
  const warn = left !== null && left <= 20 && left > 0;
  const over = left !== null && left <= 0;

  const canSubmit = enabled && value.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    if (voice.recording) voice.stop();
    onSubmit(usedVoice.current ? "voice" : "text");
    usedVoice.current = false;
  };

  // Focus the box for keyboard users on desktop; on phones this would pop the keyboard over the question.
  useEffect(() => {
    if (enabled && window.matchMedia("(pointer: fine)").matches) textRef.current?.focus({ preventScroll: true });
  }, [enabled]);

  return (
    <div className="w-full">
      <div
        className={`relative rounded-xl border bg-surface shadow-sm transition-colors duration-300 ${
          voice.recording ? "border-good" : enabled ? "border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15" : "border-line bg-surface-2"
        }`}
      >
        <label htmlFor="answer" className="sr-only">
          내 답변
        </label>
        <textarea
          id="answer"
          ref={textRef}
          value={value}
          disabled={!enabled}
          onChange={(e) => {
            onChange(e.target.value);
            pulseTyping();
          }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={enabled ? copy.placeholder : copy.placeholderWaiting}
          rows={4}
          maxLength={4000}
          className="block max-h-[38vh] min-h-[112px] w-full resize-y rounded-xl bg-transparent px-4 pt-4 pb-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed sm:min-h-[128px] sm:px-5"
        />
        <AnimatePresence>
          {voice.recording && voice.interim && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-2 text-sm text-good italic sm:px-5"
              aria-live="polite"
            >
              {voice.interim}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4">
          {voice.supported ? (
            <Button
              size="sm"
              variant={voice.recording ? "danger" : "secondary"}
              onClick={voice.recording ? voice.stop : voice.start}
              disabled={!enabled}
              aria-pressed={voice.recording}
              icon={voice.recording ? <StopIcon width={14} height={14} /> : <MicIcon width={14} height={14} />}
              className="h-9"
            >
              {voice.recording ? "정지" : "음성 답변"}
            </Button>
          ) : null}
          {voice.recording && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-low">
              <span className="h-2 w-2 animate-pulse rounded-full bg-low" /> 녹음 중
            </span>
          )}

          <span className="ml-auto flex items-center gap-3">
            {left !== null && enabled && (
              <span
                className={`font-mono text-xs tabular-nums ${over ? "text-low" : warn ? "text-warn" : "text-faint"}`}
                aria-label="남은 답변 시간"
              >
                <span className="hidden font-sans sm:inline">남은 시간 </span>
                {over ? "00:00" : mmss(left)}
              </span>
            )}
            {value.trim() && (
              <span className={`text-[11px] tabular-nums ${lengthHint(value).tone}`} title="말하기 기준 약 1분 ≈ 250~350자">
                <span className="hidden sm:inline">{value.length}자 · </span>
                {lengthHint(value).label}
              </span>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={submit}
              disabled={!canSubmit}
              icon={<SendIcon width={14} height={14} />}
              className="h-9 px-4"
              title="답변 제출 (Ctrl/⌘ + Enter)"
            >
              답변 제출
            </Button>
          </span>
        </div>
      </div>

      <div className="mt-2 flex min-h-5 items-start justify-between gap-3 px-1 text-xs" lang={copy.lang}>
      <div aria-live="polite">
        {voice.error ? (
          <span className="text-warn">{voice.error}</span>
        ) : over ? (
          <span className="text-low">{copy.timeUp}</span>
        ) : warn ? (
          <span className="text-warn">{copy.timeAlmostUp}</span>
        ) : voice.recording ? (
          <span className="text-good">{copy.recording}</span>
        ) : !voice.supported ? (
          <span className="text-faint">{copy.textMode}</span>
        ) : enabled && !value.trim() ? (
          <span className="text-faint">{copy.emptyAnswer}</span>
        ) : null}
      </div>
      {enabled && !value.trim() && !voice.recording && (
        <button type="button" onClick={onDontKnow} className="shrink-0 rounded px-1.5 py-0.5 text-faint underline-offset-2 hover:text-ink hover:underline">
          {copy.dontKnow}
        </button>
      )}
      </div>
    </div>
  );
}

/** Real interviews expect ~1-minute answers (≈250–350 Korean characters spoken). */
function lengthHint(v: string): { label: string; tone: string } {
  const n = v.replace(/\s/g, "").length;
  if (n < 60) return { label: "조금 짧아요", tone: "text-warn" };
  if (n <= 450) return { label: "적당해요", tone: "text-good" };
  return { label: "길어요 · 핵심만", tone: "text-warn" };
}
