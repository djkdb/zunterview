import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, LIMITS, PERSONAS } from "../../shared/schemas";
import { ModeBadge, TopBar } from "../components/TopBar";
import { CompanyPicker } from "../components/CompanyPicker";
import { COMPANIES, companyTracks, getCompany, guessTrack, type CompanyCategory } from "../../shared/companies";
import { RolePicker } from "../components/RolePicker";
import { planComposition, planInterview, BUCKET_LABEL } from "../../shared/blueprints";
import { roleContextFor, searchRoles } from "../../shared/roles";

/** The taxonomy role for an exact title/alias ("프론트엔드 개발자", "전기직"), if there is one. */
function exactRoleId(position: string): string | undefined {
  const m = searchRoles(position, 1)[0];
  return m && m.score >= 100 ? m.role.id : undefined;
}

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
import { ANSWER_TIME_OPTIONS, DEFAULT_CONFIG, QUESTION_LENGTHS } from "../config/options";
import type { ProviderStatus } from "../services/ai/providerFactory";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isNeuralTts, isVoiceOutputAvailable } from "../services/speech/tts";
import type { InterviewConfig } from "../types/interview";
import { loadLastConfig, saveLastConfig } from "../utils/storage";

const DIFFICULTY_HINT: Record<InterviewConfig["difficulty"], string> = {
  easy: "분위기 적응용",
  normal: "실제 1차 면접",
  hard: "압박 면접",
};

/** Apply a company choice, keeping the job consistent with the chosen track / institution type. */
const GENERIC_OFFICE = new Set(["office_admin", "general_affairs", "business_management"]);

function withCompanyDefaults(p: InterviewConfig, id: string | undefined, track: string | undefined): InterviewConfig {
  const next = { ...p, companyId: id, companyTrack: track };
  const co = getCompany(id);
  if (!co) return next;
  if (track && track !== "공통") {
    const position = positionForTrack(co.category, track);
    return { ...next, position, roleId: exactRoleId(position) };
  }
  // A generic office job at a public institution is its 공기업 사무·행정 track.
  if ((co.category === "공기업" || co.category === "공공기관") && p.roleId && GENERIC_OFFICE.has(p.roleId)) {
    return { ...next, position: "공기업 사무·행정", roleId: "pe_admin" };
  }
  const tech = ["tech_dev", "data_analytic"].includes(roleContextFor(p).archetype);
  if (tech && (co.category === "공기업" || co.category === "공공기관") && guessTrack(co, p.position) === "공통") {
    // IT jobs rarely fit a public institution's common track; start from the administrative track.
    const t = companyTracks(co).find((x) => /사무|행정/.test(x));
    if (t) {
      const position = positionForTrack(co.category, t);
      return { ...next, companyTrack: t, position, roleId: exactRoleId(position) };
    }
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
  if (!isVoiceOutputAvailable()) merged.voiceEnabled = false;
  // Configs saved before the role taxonomy existed only have a job title.
  if (!merged.roleId) merged.roleId = exactRoleId(merged.position);
  merged.customRole = undefined;
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
  const set = <K extends keyof InterviewConfig>(k: K, v: InterviewConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  const position = c.position.trim();
  const valid = position.length > 0 && position.length <= LIMITS.position;
  const ttsOk = isVoiceOutputAvailable();

  const company = getCompany(c.companyId);
  const role = roleContextFor(c);
  const composition = planComposition(planInterview({ archetype: role.archetype, interviewType: c.interviewType, experience: c.experience, questionLimit: c.questionLimit, company: Boolean(company) }));
  const summaryRows: [string, string][] = [
    ["지원 기업", company ? `${company.name}${c.companyTrack && c.companyTrack !== "공통" ? ` · ${c.companyTrack}` : ""}` : "선택 안 함 (직무 면접)"],
    ["지원 직무", position || "—"],
    ["직무 분야", role.domain ? `${role.domain.name}${role.family ? ` › ${role.family.name}` : ""}${role.role ? "" : " (추정)"}` : "—"],
    ["경력", EXPERIENCE_KO[c.experience]],
    ["면접", `${INTERVIEW_TYPE_KO[c.interviewType]} · ${DIFFICULTY_KO[c.difficulty]}`],
    ["분량", `메인 ${c.questionLimit}문항 · 약 ${Math.round(c.questionLimit * 2.5)}분`],
    ["질문 구성", composition.map((x) => `${BUCKET_LABEL[x.bucket].ko} ${x.pct}%`).join(" · ")],
    ["면접관", `${PERSONA_KO[c.persona]} · 음성 ${c.voiceEnabled && ttsOk ? "켜짐" : "꺼짐"}`],
    ["답변 시간", c.answerTimeLimit ? `문항당 ${c.answerTimeLimit / 60}분` : "제한 없음"],
  ];
  const summaryLine = `${company ? `${company.shortName ?? company.name} · ` : ""}${INTERVIEW_TYPE_KO[c.interviewType]} · ${DIFFICULTY_KO[c.difficulty]} · ${c.questionLimit}문항 · 약 ${Math.round(c.questionLimit * 2.5)}분`;

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
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <p className="text-sm font-semibold text-accent">면접 접수</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl">어떤 면접을 준비하시나요?</h1>
          <p className="mt-2 text-[15px] text-muted">직무를 고르면 그 직무의 실무·상황·경험 질문으로 면접이 구성되고, 내 답변에 따라 꼬리질문이 이어집니다.</p>
        </motion.div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <form
          id="setup-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <Section no={1} title="지원 직무">
            <fieldset>
              <legend className="sr-only">지원 직무</legend>
              <RolePicker
                position={c.position}
                roleId={c.roleId}
                composition={composition}
                onChange={(pos, roleId) => setC((p) => ({ ...p, position: pos, roleId, customRole: undefined }))}
              />
            </fieldset>
          </Section>

          {COMPANIES.length > 0 && (
            <Section no={2} title="지원 기업 (선택)">
              <CompanyPicker
                companyId={c.companyId}
                track={c.companyTrack}
                onChange={(id, track) => {
                  setC(withCompanyDefaults(c, id, track));
                }}
              />
            </Section>
          )}

          <Section no={3} title="지원 정보">
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
                placeholder="지원하는 공고의 자격요건·우대사항을 붙여넣으면 그 요건을 실제 경험으로 검증하는 질문이 나옵니다. (예: GA4·SQL 활용 능력, B2B 영업 경험 우대, 결산 실무 경험)"
                className="w-full resize-y rounded-lg border border-line-strong bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
              />
              <p className="mt-1.5 text-[12px] text-faint">이름·연락처 등 개인정보는 넣지 마세요. 질문을 맞추는 데에만 사용됩니다.</p>
            </div>
          </Section>

          <Section no={4} title="면접 구성">
            <Segmented
              label="면접 유형"
              value={c.interviewType}
              onChange={(v) => set("interviewType", v)}
              columns={5}
              options={INTERVIEW_TYPES.map((v) => ({ value: v, label: INTERVIEW_TYPE_KO[v], hint: INTERVIEW_TYPE_HINT_KO[v] }))}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <Segmented label="난이도" value={c.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFICULTIES.map((v) => ({ value: v, label: DIFFICULTY_KO[v], hint: DIFFICULTY_HINT[v] }))} />
              <Segmented label="메인 질문 수 (꼬리질문은 답변에 따라 추가)" value={c.questionLimit} onChange={(v) => set("questionLimit", v)} options={QUESTION_LENGTHS.map((v) => ({ value: v, label: `${v}문항`, hint: `약 ${Math.round(v * 2.5)}분` }))} />
            </div>
          </Section>

          <Section no={5} title="면접 환경">
            <Segmented label="면접관 스타일" value={c.persona} onChange={(v) => set("persona", v)} columns={4} options={PERSONAS.map((v) => ({ value: v, label: PERSONA_KO[v] }))} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Segmented label="면접 언어" value={c.language} onChange={(v) => set("language", v)} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "영어 면접" }]} />
              <Segmented label="문항당 답변 시간" value={c.answerTimeLimit} onChange={(v) => set("answerTimeLimit", v)} options={ANSWER_TIME_OPTIONS} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="면접관 음성"
                description={
                  !ttsOk ? "이 브라우저는 음성 출력을 지원하지 않아요" : isNeuralTts() ? "Fish Audio 음성 · 면접관마다 다른 목소리" : "면접관이 질문을 소리 내어 읽어 줍니다"
                }
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

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4 lg:hidden">
            <p className="mb-2 truncate text-center text-[12px] text-muted sm:hidden">{summaryLine}</p>
            <Button type="submit" variant="primary" size="lg" disabled={!valid} className="w-full flex-row-reverse sm:w-auto sm:px-12" icon={<ArrowIcon width={18} height={18} />}>
              접수하고 대기실로 이동
            </Button>
          </div>
        </form>

        {/* desktop: sticky application summary */}
        <aside className="sticky top-20 hidden lg:block" aria-label="접수 요약">
          <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-sm">
            <div className="bg-navy px-5 py-3 text-[14px] font-bold text-white">접수 요약</div>
            <dl className="divide-y divide-line text-[13px]">
              {summaryRows.map(([k, v]) => (
                <div key={k} className="flex gap-3 px-5 py-2.5">
                  <dt className="w-16 shrink-0 text-faint">{k}</dt>
                  <dd className="min-w-0 flex-1 font-semibold break-keep text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line p-4">
              <Button type="submit" form="setup-form" variant="primary" size="lg" disabled={!valid} className="w-full flex-row-reverse" icon={<ArrowIcon width={18} height={18} />}>
                접수하고 대기실로 이동
              </Button>
              <p className="mt-2.5 text-center text-[11px] leading-relaxed text-faint">면접관 3인이 번갈아 질문하고, 답변에 따라 꼬리질문이 이어집니다.</p>
            </div>
          </div>
        </aside>
        </div>
      </main>
    </div>
  );
}
