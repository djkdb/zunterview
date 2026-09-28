import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, LIMITS, PERSONAS } from "../../shared/schemas";
import { ModeBadge, TopBar } from "../components/TopBar";
import { CompanyPicker } from "../components/CompanyPicker";
import { COMPANIES, companyTracks, getCompany, guessTrack, type CompanyCategory } from "../../shared/companies";

/** "전기" at a public enterprise → "전기직"; "개발" at a company → "개발자". */
function positionForTrack(category: CompanyCategory, track: string): string {
  if (category === "공기업" || category === "공공기관") return /직$/.test(track) ? track : `${track}직`;
  if (track === "개발") return "개발자";
  return track;
}
import { Button } from "../components/ui/Button";
import { ArrowIcon } from "../components/ui/icons";
import { Segmented } from "../components/ui/Segmented";
import { Toggle } from "../components/ui/Toggle";
import { DIFFICULTY_KO, EXPERIENCE_KO, INTERVIEW_TYPE_HINT_KO, INTERVIEW_TYPE_KO, PERSONA_KO } from "../config/labelsKo";
import { ANSWER_TIME_OPTIONS, DEFAULT_CONFIG, POSITION_PRESETS, QUESTION_LENGTHS } from "../config/options";
import type { ProviderStatus } from "../services/ai/providerFactory";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isSpeechSynthesisSupported } from "../services/speech/speechSynthesis";
import type { InterviewConfig } from "../types/interview";
import { loadLastConfig, saveLastConfig } from "../utils/storage";

const DIFFICULTY_HINT: Record<InterviewConfig["difficulty"], string> = {
  easy: "분위기 적응용",
  normal: "실제 1차 면접",
  hard: "압박 · 꼬리질문 多",
};

/** Apply a company choice, keeping the job consistent with the chosen track / institution type. */
function withCompanyDefaults(p: InterviewConfig, id: string | undefined, track: string | undefined): InterviewConfig {
  const next = { ...p, companyId: id, companyTrack: track };
  const co = getCompany(id);
  if (!co) return next;
  if (track && track !== "공통") return { ...next, position: positionForTrack(co.category, track) };
  const fromPreset = (POSITION_PRESETS as readonly string[]).includes(p.position);
  if (fromPreset && (co.category === "공기업" || co.category === "공공기관") && guessTrack(co, p.position) === "공통") {
    // Tech presets rarely fit a public institution; start from the administrative track.
    const t = companyTracks(co).find((x) => /사무|행정/.test(x));
    if (t) return { ...next, companyTrack: t, position: positionForTrack(co.category, t) };
  }
  return next;
}

function initialConfig(preset?: { companyId: string; track?: string } | null): InterviewConfig {
  const saved = loadLastConfig();
  let merged: InterviewConfig = { ...DEFAULT_CONFIG, ...(saved ?? {}) };
  if (preset) merged = withCompanyDefaults(merged, preset.companyId, preset.track === "공통" ? undefined : preset.track);
  if (!getCompany(merged.companyId)) {
    merged.companyId = undefined;
    merged.companyTrack = undefined;
  }
  if (!isSpeechSynthesisSupported()) merged.voiceEnabled = false;
  return merged;
}

function Section({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 text-[15px] font-bold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy font-mono text-[11px] text-white">{no}</span>
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

interface SetupProps {
  status: ProviderStatus | null;
  onStart: (c: InterviewConfig) => void;
  onHome: () => void;
  preset?: { companyId: string; track?: string } | null;
}

export function SetupPage({ status, onStart, onHome, preset }: SetupProps) {
  const [c, setC] = useState<InterviewConfig>(() => initialConfig(preset));
  const isPreset = (POSITION_PRESETS as readonly string[]).includes(c.position);
  const [custom, setCustom] = useState(isPreset ? "" : c.position);
  const [useCustom, setUseCustom] = useState(!isPreset);
  const set = <K extends keyof InterviewConfig>(k: K, v: InterviewConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  const position = (useCustom ? custom : c.position).trim();
  const valid = position.length > 0 && position.length <= LIMITS.position;
  const ttsOk = isSpeechSynthesisSupported();

  const start = () => {
    if (!valid) return;
    const company = getCompany(c.companyId);
    const config = { ...c, position, companyTrack: company ? (c.companyTrack ?? guessTrack(company, position)) : undefined };
    saveLastConfig(config);
    onStart(config);
  };

  return (
    <div className="min-h-dvh pb-28 sm:pb-16">
      <TopBar onHome={onHome} modeBadge={<ModeBadge mode={status?.mode ?? null} detail={status?.model ?? undefined} />} />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <p className="text-sm font-semibold text-accent">면접 접수</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl">어떤 면접을 준비하시나요?</h1>
          <p className="mt-2 text-[15px] text-muted">입력한 정보와 내 답변을 바탕으로 면접관이 다음 질문을 정합니다.</p>
        </motion.div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          {COMPANIES.length > 0 && (
            <Section no={1} title="지원 기업 (선택)">
              <CompanyPicker
                companyId={c.companyId}
                track={c.companyTrack}
                onChange={(id, track) => {
                  const next = withCompanyDefaults(c, id, track);
                  setC(next);
                  if (next.position !== c.position) {
                    setUseCustom(!(POSITION_PRESETS as readonly string[]).includes(next.position));
                    setCustom(next.position);
                  }
                }}
              />
            </Section>
          )}

          <Section no={2} title="지원 정보">
            <fieldset>
              <legend className="label mb-2.5">지원 직무</legend>
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
                      className={`min-h-10 rounded-lg border px-3.5 text-sm transition-colors ${
                        active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-ink"
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
                  className={`min-h-10 rounded-lg border px-3.5 text-sm transition-colors ${
                    useCustom ? "border-accent bg-accent-soft font-semibold text-accent" : "border-dashed border-line-strong text-muted hover:text-ink"
                  }`}
                >
                  + 직접 입력
                </button>
              </div>
              {useCustom && (
                <input
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={LIMITS.position}
                  placeholder="예: 데이터 분석가, iOS 개발자, 인사 담당자"
                  aria-label="지원 직무 직접 입력"
                  className="mt-3 h-12 w-full rounded-lg border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
                />
              )}
            </fieldset>

            <Segmented label="경력 구분" value={c.experience} onChange={(v) => set("experience", v)} columns={4} options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_KO[v] }))} />

            <div>
              <label htmlFor="jd" className="label mb-2.5 flex items-center justify-between">
                <span>
                  채용공고 · 직무기술서 <span className="font-normal text-faint">(선택)</span>
                </span>
                <span className="font-normal">
                  {c.jobDescription.length}/{LIMITS.jobDescription}
                </span>
              </label>
              <textarea
                id="jd"
                value={c.jobDescription}
                onChange={(e) => set("jobDescription", e.target.value.slice(0, LIMITS.jobDescription))}
                rows={4}
                placeholder="지원하는 공고의 자격요건·우대사항을 붙여넣으면 해당 내용으로 질문합니다. (예: React, TypeScript, 성능 최적화 경험 우대)"
                className="w-full resize-y rounded-lg border border-line-strong bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
              />
              <p className="mt-1.5 text-[12px] text-faint">이름·연락처 등 개인정보는 넣지 마세요. 질문을 맞추는 데에만 사용됩니다.</p>
            </div>
          </Section>

          <Section no={3} title="면접 구성">
            <Segmented
              label="면접 유형"
              value={c.interviewType}
              onChange={(v) => set("interviewType", v)}
              columns={5}
              options={INTERVIEW_TYPES.map((v) => ({ value: v, label: INTERVIEW_TYPE_KO[v], hint: INTERVIEW_TYPE_HINT_KO[v] }))}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <Segmented label="난이도" value={c.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFICULTIES.map((v) => ({ value: v, label: DIFFICULTY_KO[v], hint: DIFFICULTY_HINT[v] }))} />
              <Segmented label="문항 수 (꼬리질문 포함)" value={c.questionLimit} onChange={(v) => set("questionLimit", v)} options={QUESTION_LENGTHS.map((v) => ({ value: v, label: `${v}문항`, hint: `약 ${v * 2}분` }))} />
            </div>
          </Section>

          <Section no={4} title="면접 환경">
            <Segmented label="면접관 스타일" value={c.persona} onChange={(v) => set("persona", v)} columns={4} options={PERSONAS.map((v) => ({ value: v, label: PERSONA_KO[v] }))} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Segmented label="면접 언어" value={c.language} onChange={(v) => set("language", v)} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "영어 면접" }]} />
              <Segmented label="문항당 답변 시간" value={c.answerTimeLimit} onChange={(v) => set("answerTimeLimit", v)} options={ANSWER_TIME_OPTIONS} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="면접관 음성"
                description={ttsOk ? "면접관이 질문을 소리 내어 읽어 줍니다" : "이 브라우저는 음성 출력을 지원하지 않아요"}
                checked={c.voiceEnabled && ttsOk}
                onChange={(v) => set("voiceEnabled", v)}
                disabled={!ttsOk}
              />
              <Toggle label="실시간 피드백" description="면접 기록에 문항별 점수를 바로 표시" checked={c.liveFeedback} onChange={(v) => set("liveFeedback", v)} />
            </div>
            <p className="text-[12px] leading-relaxed text-faint">
              {isSpeechRecognitionSupported()
                ? "음성 답변 가능 — [음성 답변] 버튼을 누를 때만 마이크가 켜집니다."
                : "이 브라우저는 음성 답변을 지원하지 않아 텍스트로 답변합니다."}{" "}
              카메라는 사용하지 않습니다.
            </p>
          </Section>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
            <Button type="submit" variant="primary" size="lg" disabled={!valid} className="w-full flex-row-reverse sm:w-auto sm:px-12" icon={<ArrowIcon width={18} height={18} />}>
              접수하고 대기실로 이동
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
