import { useState } from "react";
import { motion } from "framer-motion";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, LIMITS, PERSONAS } from "../../shared/schemas";
import { DIFFICULTY_LABEL, EXPERIENCE_LABEL, INTERVIEW_TYPE_LABEL, PERSONA_LABEL } from "../../shared/labels";
import { ModeBadge, TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { ArrowIcon } from "../components/ui/icons";
import { Segmented } from "../components/ui/Segmented";
import { Toggle } from "../components/ui/Toggle";
import { ANSWER_TIME_OPTIONS, DEFAULT_CONFIG, POSITION_PRESETS, QUESTION_LENGTHS } from "../config/options";
import type { ProviderStatus } from "../services/ai/providerFactory";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isSpeechSynthesisSupported } from "../services/speech/speechSynthesis";
import type { InterviewConfig } from "../types/interview";
import { loadLastConfig, saveLastConfig } from "../utils/storage";

const TYPE_HINT: Record<InterviewConfig["interviewType"], string> = {
  hr: "Motivation, fit",
  technical: "Decisions, depth",
  project: "Your projects",
  behavioral: "Past situations",
  mixed: "A bit of all",
};

function initialConfig(): InterviewConfig {
  const saved = loadLastConfig();
  const merged = { ...DEFAULT_CONFIG, ...(saved ?? {}) };
  if (!isSpeechSynthesisSupported()) merged.voiceEnabled = false;
  return merged;
}

export function SetupPage({ status, onStart, onHome }: { status: ProviderStatus | null; onStart: (c: InterviewConfig) => void; onHome: () => void }) {
  const [c, setC] = useState<InterviewConfig>(initialConfig);
  const isPreset = (POSITION_PRESETS as readonly string[]).includes(c.position);
  const [custom, setCustom] = useState(isPreset ? "" : c.position);
  const [useCustom, setUseCustom] = useState(!isPreset);
  const set = <K extends keyof InterviewConfig>(k: K, v: InterviewConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  const position = (useCustom ? custom : c.position).trim();
  const valid = position.length > 0 && position.length <= LIMITS.position;
  const ttsOk = isSpeechSynthesisSupported();

  const start = () => {
    if (!valid) return;
    const config = { ...c, position };
    saveLastConfig(config);
    onStart(config);
  };

  return (
    <div className="min-h-dvh pb-28 sm:pb-16">
      <TopBar onHome={onHome} modeBadge={<ModeBadge mode={status?.mode ?? null} detail={status?.model ?? undefined} />} />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 sm:pt-10">
          <p className="label text-accent">Interview setup</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">What are we interviewing for?</h1>
          <p className="mt-2 text-sm text-muted">Alex uses these settings — and your answers — to decide what to ask next.</p>
        </motion.div>

        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <fieldset>
            <legend className="label mb-2.5">Position</legend>
            <div className="flex flex-wrap gap-2">
              {POSITION_PRESETS.map((p) => {
                const active = !useCustom && c.position === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setUseCustom(false);
                      set("position", p);
                    }}
                    className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                      active ? "border-accent/60 bg-accent-soft text-ink" : "border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={useCustom}
                onClick={() => setUseCustom(true)}
                className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                  useCustom ? "border-accent/60 bg-accent-soft text-ink" : "border-dashed border-line-strong text-muted hover:text-ink"
                }`}
              >
                + Other
              </button>
            </div>
            {useCustom && (
              <input
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={LIMITS.position}
                placeholder="e.g. Data Analyst, iOS Developer, 서비스 기획자"
                aria-label="Custom position"
                className="mt-3 h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none"
              />
            )}
          </fieldset>

          <Segmented label="Experience" value={c.experience} onChange={(v) => set("experience", v)} options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_LABEL[v] }))} />

          <Segmented
            label="Interview type"
            value={c.interviewType}
            onChange={(v) => set("interviewType", v)}
            columns={5}
            options={INTERVIEW_TYPES.map((v) => ({ value: v, label: INTERVIEW_TYPE_LABEL[v], hint: TYPE_HINT[v] }))}
          />

          <div className="grid gap-8 sm:grid-cols-2">
            <Segmented label="Difficulty" value={c.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFICULTIES.map((v) => ({ value: v, label: DIFFICULTY_LABEL[v] }))} />
            <Segmented label="Interview length" value={c.questionLimit} onChange={(v) => set("questionLimit", v)} options={QUESTION_LENGTHS.map((v) => ({ value: v, label: `${v} Q` }))} />
          </div>

          <div>
            <label htmlFor="jd" className="label mb-2.5 flex items-center justify-between">
              <span>Job description <span className="normal-case tracking-normal text-faint">(optional)</span></span>
              <span className="tracking-normal">{c.jobDescription.length}/{LIMITS.jobDescription}</span>
            </label>
            <textarea
              id="jd"
              value={c.jobDescription}
              onChange={(e) => set("jobDescription", e.target.value.slice(0, LIMITS.jobDescription))}
              rows={4}
              placeholder="Paste the job posting. Questions will reflect its requirements (e.g. React, TypeScript, 성능 최적화 경험)."
              className="w-full resize-y rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-faint">Avoid pasting personal information. It's only used to tailor questions.</p>
          </div>

          <details className="group rounded-2xl border border-line bg-surface/40 px-4 py-3 open:pb-5 sm:px-5">
            <summary className="cursor-pointer list-none py-1 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              <span className="inline-block transition-transform group-open:rotate-90">›</span> Interviewer & session options
            </summary>
            <div className="mt-5 space-y-7">
              <Segmented label="Interviewer style" value={c.persona} onChange={(v) => set("persona", v)} columns={4} options={PERSONAS.map((v) => ({ value: v, label: PERSONA_LABEL[v] }))} />
              <div className="grid gap-7 sm:grid-cols-2">
                <Segmented label="Language" value={c.language} onChange={(v) => set("language", v)} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "English" }]} />
                <Segmented label="Time per answer" value={c.answerTimeLimit} onChange={(v) => set("answerTimeLimit", v)} options={ANSWER_TIME_OPTIONS} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Interviewer voice"
                  description={ttsOk ? "Alex reads questions aloud" : "Not supported in this browser"}
                  checked={c.voiceEnabled && ttsOk}
                  onChange={(v) => set("voiceEnabled", v)}
                  disabled={!ttsOk}
                />
                <Toggle label="Live feedback" description="Show scores in notes during the interview" checked={c.liveFeedback} onChange={(v) => set("liveFeedback", v)} />
              </div>
              <p className="text-xs text-faint">
                {isSpeechRecognitionSupported()
                  ? "Voice answers are available — the mic only turns on when you press Record."
                  : "Voice answers aren't supported in this browser; you'll answer by typing."}{" "}
                The camera is never used.
              </p>
            </div>
          </details>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
            <Button type="submit" variant="primary" size="lg" disabled={!valid} className="w-full sm:w-auto" icon={<ArrowIcon width={16} height={16} />}>
              Start interview
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
