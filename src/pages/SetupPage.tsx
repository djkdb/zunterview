import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, LIMITS, PERSONAS, type Documents } from "../../shared/schemas";
import { ModeBadge, TopBar } from "../components/TopBar";
import { CompanyPicker } from "../components/CompanyPicker";
import { jdRequirements } from "../utils/jdCheck";
import { COMPANIES, companyTracks, getCompany, guessTrack, type CompanyCategory } from "../../shared/companies";
import { RolePicker } from "../components/RolePicker";
import { FollowUpPath } from "../components/FollowUpPath";
import { planComposition, planInterview, BUCKET_LABEL } from "../../shared/blueprints";
import { roleContextFor, searchRoles } from "../../shared/roles";
import { hasDocuments, redactPersonalInfo } from "../../shared/documents";
import { Button } from "../components/ui/Button";
import { CheckIcon, ChevronIcon } from "../components/ui/icons";
import { Segmented } from "../components/ui/Segmented";
import { Toggle } from "../components/ui/Toggle";
import { DIFFICULTY_KO, EXPERIENCE_KO, INTERVIEW_TYPE_HINT_KO, INTERVIEW_TYPE_KO, PERSONA_KO } from "../config/labelsKo";
import { ANSWER_TIME_OPTIONS, DEFAULT_CONFIG, QUESTION_LENGTHS } from "../config/options";
import type { ProviderStatus } from "../services/ai/providerFactory";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isNeuralTts, isVoiceOutputAvailable } from "../services/speech/tts";
import type { InterviewConfig } from "../types/interview";
import { PRIVACY_VERSION } from "./LegalPage";
import { forgetDocuments, loadLastConfig, loadSavedDocuments, saveDocuments, saveLastConfig } from "../utils/storage";

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

const CONSENT_KEY = "interview-ai:consent";

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
  let merged: InterviewConfig = { ...DEFAULT_CONFIG, ...(saved ?? {}), documents: undefined };
  if (preset) merged = withCompanyDefaults(merged, preset.companyId, preset.track === "공통" ? undefined : preset.track);
  if (!getCompany(merged.companyId)) {
    merged.companyId = undefined;
    merged.companyTrack = undefined;
  }
  if (!isVoiceOutputAvailable()) merged.voiceEnabled = false;
  // Configs saved before the role taxonomy existed only have a job title.
  if (!merged.roleId && merged.position) merged.roleId = exactRoleId(merged.position);
  merged.customRole = undefined;
  return merged;
}

/* ─────────────────────────────── presets ─────────────────────────────── */

type StyleKey = "real" | "light" | "pressure" | "focus";
const STYLES: { key: StyleKey; title: string; desc: string; tag?: string; set: Pick<InterviewConfig, "interviewType" | "difficulty" | "persona"> }[] = [
  { key: "real", title: "실전 1차 면접", desc: "인성, 직무, 경험 질문을 섞은 보통 난이도의 1차 면접", tag: "추천", set: { interviewType: "mixed", difficulty: "normal", persona: "professional" } },
  { key: "light", title: "가볍게 연습", desc: "쉬운 질문에 친근한 면접관. 처음 연습할 때 좋습니다", set: { interviewType: "mixed", difficulty: "easy", persona: "friendly" } },
  { key: "pressure", title: "압박 면접", desc: "모호한 답은 바로 되묻고 반론을 던집니다", set: { interviewType: "mixed", difficulty: "hard", persona: "strict" } },
  { key: "focus", title: "직무 집중", desc: "실무 전문가가 직무 지식과 판단을 파고듭니다", set: { interviewType: "technical", difficulty: "normal", persona: "technical" } },
];
const styleOf = (c: InterviewConfig): StyleKey | null =>
  STYLES.find((s) => s.set.interviewType === c.interviewType && s.set.difficulty === c.difficulty && s.set.persona === c.persona)?.key ?? null;

/* ─────────────────────────────── pieces ─────────────────────────────── */

const STEPS = [
  { title: "직무·경력", heading: "어떤 직무로 지원하시나요?", sub: "직무를 고르면 그 직무의 실무·상황·경험 질문으로 면접이 구성됩니다." },
  { title: "서류·기업", heading: "어떤 자료로 면접을 볼까요?", sub: "서류 없이 바로 볼 수도 있고, 내 이력서·자기소개서를 근거로 캐묻는 실전형으로 볼 수도 있어요." },
  { title: "면접 방식", heading: "어떤 분위기로 진행할까요?", sub: "추천 구성으로 바로 시작하거나, 세부 설정에서 직접 조정하세요." },
] as const;

function Stepper({ step, reachable, onGo }: { step: number; reachable: (i: number) => boolean; onGo: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-3 gap-1.5 sm:gap-2" aria-label="접수 단계">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => onGo(i)}
              disabled={!reachable(i) || active}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors sm:px-3 ${
                active ? "border-accent bg-surface shadow-sm" : done ? "border-line bg-surface/70 hover:border-accent/40" : "border-transparent bg-surface-3/60"
              } disabled:cursor-default`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full tabular-nums text-[11px] ${
                  active ? "bg-accent text-white" : done ? "bg-good text-white" : "bg-surface text-faint"
                }`}
              >
                {done ? <CheckIcon width={13} height={13} /> : i + 1}
              </span>
              <span className={`truncate text-[13px] font-semibold ${active ? "text-ink" : done ? "text-muted" : "text-faint"}`}>{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-baseline justify-between gap-3 text-[15px] font-bold text-ink">
        {title}
        {aside}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** A big radio card ("서류 없이 바로 면접" / "내 서류로 면접", the interview style presets). */
function ChoiceCard({ checked, onClick, title, desc, tag }: { checked: boolean; onClick: () => void; title: string; desc: string; tag?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`relative flex h-full w-full flex-col items-start rounded-xl border-2 p-4 text-left transition-colors ${
        checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/35"
      }`}
    >
      <span className="flex w-full items-center gap-2">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-accent bg-accent" : "border-line-strong"}`}>
          {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-[15px] font-bold text-ink">{title}</span>
        {tag && <span className="ml-auto rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-white">{tag}</span>}
      </span>
      <span className="mt-1.5 pl-7 text-[13px] leading-relaxed text-muted">{desc}</span>
    </button>
  );
}

function DocField({ id, label, hint, value, onChange, onBlur, placeholder }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; onBlur: () => void; placeholder: string }) {
  return (
    <div>
      <label htmlFor={id} className="label mb-2 flex items-center justify-between">
        <span>
          {label} <span className="font-normal text-faint">{hint}</span>
        </span>
        <span className={`font-normal ${value.length >= LIMITS.document ? "text-warn" : ""}`}>
          {value.length.toLocaleString()}/{LIMITS.document.toLocaleString()}
        </span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, LIMITS.document))}
        onBlur={onBlur}
        rows={6}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-line-strong bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
      />
    </div>
  );
}

const MASKS = /\[(?:이메일|전화번호|주민번호|링크)\]/g;

/* ─────────────────────────────── page ─────────────────────────────── */

interface SetupProps {
  status: ProviderStatus | null;
  onStart: (c: InterviewConfig) => void;
  onHome: () => void;
  preset?: { companyId: string; track?: string } | null;
}

export function SetupPage({ status, onStart, onHome, preset }: SetupProps) {
  const [c, setC] = useState<InterviewConfig>(() => initialConfig(preset));
  const set = <K extends keyof InterviewConfig>(k: K, v: InterviewConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  const [returning] = useState(() => Boolean(loadLastConfig()?.position));
  const [step, setStep] = useState(0);

  // Documents: kept in this component (and in this browser only if the candidate asks).
  const [saved] = useState(() => loadSavedDocuments());
  const [docMode, setDocMode] = useState(() => hasDocuments(saved));
  const [docs, setDocs] = useState<Documents>(() => saved ?? { resume: "", coverLetter: "" });
  const [remember, setRemember] = useState(() => hasDocuments(saved));
  const [jdOpen, setJdOpen] = useState(() => c.jobDescription.trim().length > 0);
  const [details, setDetails] = useState(false);

  const position = c.position.trim();
  const roleOk = position.length > 0 && position.length <= LIMITS.position;
  const docsOk = !docMode || hasDocuments(docs);
  const ttsOk = isVoiceOutputAvailable();
  // AI mode sends answers abroad for processing: ask once per policy version.
  const needsConsent = status?.mode === "ai";
  const [consented, setConsented] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === PRIVACY_VERSION;
    } catch {
      return false;
    }
  });
  const reachable = (i: number) => i === 0 || (i === 1 ? roleOk : roleOk && docsOk);
  const masked = (docs.resume.match(MASKS) ?? []).length + (docs.coverLetter.match(MASKS) ?? []).length;

  const company = getCompany(c.companyId);
  const role = roleContextFor(c);
  const composition = planComposition(planInterview({ archetype: role.archetype, interviewType: c.interviewType, experience: c.experience, questionLimit: c.questionLimit, company: Boolean(company) }));
  const style = styleOf(c);
  const minutes = Math.round(c.questionLimit * 2.5);
  const docLabel = docMode && hasDocuments(docs) ? [docs.coverLetter.trim() && "자기소개서", docs.resume.trim() && "이력서"].filter(Boolean).join("·") : "";

  const summaryRows: [string, string, number][] = [
    ["지원 직무", position || "—", 0],
    ["경력", EXPERIENCE_KO[c.experience], 0],
    ["면접 자료", docLabel ? `${docLabel} 기반` : "서류 없이 (직무 기반)", 1],
    ["지원 기업", company ? `${company.name}${c.companyTrack && c.companyTrack !== "공통" ? ` ${c.companyTrack}` : ""}` : "선택 안 함", 1],
    ["면접", STYLES.find((s) => s.key === style)?.title ?? `직접 설정 (${INTERVIEW_TYPE_KO[c.interviewType]}, ${DIFFICULTY_KO[c.difficulty]})`, 2],
    ["분량", `메인 ${c.questionLimit}문항, 약 ${minutes}분`, 2],
    ["질문 구성", composition.map((x) => `${BUCKET_LABEL[x.bucket].ko} ${x.pct}%`).join(", ") + (docLabel ? " (절반가량은 서류 확인)" : ""), 2],
    ["면접관", `${PERSONA_KO[c.persona]} 스타일, 음성 ${c.voiceEnabled && ttsOk ? "켜짐" : "꺼짐"}`, 2],
  ];
  const summaryLine = position ? `${position} ${EXPERIENCE_KO[c.experience]}${docLabel ? ", 서류 기반" : ""}, ${c.questionLimit}문항 약 ${minutes}분` : "직무를 아직 고르지 않았습니다";

  // Each step starts at the top of the page.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const redact = () => setDocs((d) => ({ resume: redactPersonalInfo(d.resume), coverLetter: redactPersonalInfo(d.coverLetter) }));

  const start = () => {
    if (!roleOk || !docsOk || (needsConsent && !consented)) return;
    if (needsConsent) {
      try {
        localStorage.setItem(CONSENT_KEY, PRIVACY_VERSION);
      } catch {
        /* asked again next time */
      }
    }
    const documents = docMode && hasDocuments(docs) ? { resume: redactPersonalInfo(docs.resume.trim()), coverLetter: redactPersonalInfo(docs.coverLetter.trim()) } : undefined;
    if (documents && remember) saveDocuments(documents);
    else forgetDocuments();
    const config: InterviewConfig = { ...c, position, companyTrack: company ? (c.companyTrack ?? guessTrack(company, position)) : undefined, documents };
    saveLastConfig(config);
    onStart(config);
  };

  const last = step === STEPS.length - 1;
  const canNext = step === 0 ? roleOk : step === 1 ? docsOk : !needsConsent || consented;
  const next = () => {
    if (last) start();
    else if (canNext) setStep(step + 1);
  };
  const blocker = step === 0 && !roleOk ? "직무를 먼저 선택해 주세요" : step === 1 && !docsOk ? "자기소개서나 이력서 중 하나 이상 붙여넣어 주세요" : step === 2 && needsConsent && !consented ? "AI 면접관 이용 동의에 체크해 주세요" : "";
  const nextLabel = last ? "접수하고 대기실로 이동" : `다음: ${STEPS[step + 1].title}`;

  return (
    <div className="min-h-dvh pb-36 sm:pb-16">
      <TopBar onHome={onHome} modeBadge={<ModeBadge mode={status?.mode ?? null} detail={status?.model ?? undefined} />} />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-5xl">
        <div className="pt-5 pb-5 sm:pt-8">
          <Stepper step={step} reachable={reachable} onGo={setStep} />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
          <form
            id="setup-form"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="space-y-4">
                <header className="pb-1">
                  <h1 className="text-[22px] font-extrabold text-navy sm:text-3xl">{STEPS[step].heading}</h1>
                  <p className="mt-1.5 text-[14px] text-muted sm:text-[15px]">{STEPS[step].sub}</p>
                </header>

                {step === 0 && (
                  <>
                    {returning && (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-accent-soft px-4 py-2.5 text-[13px] text-accent">
                        지난번 접수 내용을 불러왔어요.
                        <button
                          type="button"
                          className="font-semibold underline underline-offset-2"
                          onClick={() => {
                            setC({ ...DEFAULT_CONFIG, voiceEnabled: DEFAULT_CONFIG.voiceEnabled && ttsOk });
                            setDocMode(false);
                          }}
                        >
                          처음부터 고르기
                        </button>
                      </p>
                    )}
                    <Card title="지원 직무">
                      <RolePicker
                        key={c.position ? "picked" : "empty"}
                        position={c.position}
                        roleId={c.roleId}
                        composition={composition}
                        onChange={(pos, roleId) => setC((p) => ({ ...p, position: pos, roleId, customRole: undefined }))}
                      />
                    </Card>
                    <Card title="경력 구분">
                      <Segmented label="경력 구분" value={c.experience} onChange={(v) => set("experience", v)} columns={4} options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_KO[v] }))} />
                    </Card>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div role="radiogroup" aria-label="면접 자료" className="grid gap-3 sm:grid-cols-2">
                      <ChoiceCard checked={!docMode} onClick={() => setDocMode(false)} title="서류 없이 바로 면접" desc="직무와 경력에 맞춘 질문으로 진행해요. 처음 연습하거나 서류가 아직 없을 때." />
                      <ChoiceCard checked={docMode} onClick={() => setDocMode(true)} title="내 이력서·자소서로 면접" tag="실전형" desc="면접관이 서류를 읽고 들어와 '자기소개서에 ~라고 쓰셨는데…' 하고 캐묻습니다." />
                    </div>

                    {docMode && (
                      <Card title="제출 서류" aside={<span className="text-[12px] font-normal text-faint">하나만 넣어도 돼요</span>}>
                        <DocField
                          id="cover-letter"
                          label="자기소개서"
                          hint="(지원동기·경험 문항)"
                          value={docs.coverLetter}
                          onChange={(v) => setDocs((d) => ({ ...d, coverLetter: v }))}
                          onBlur={redact}
                          placeholder={"문항 제목은 빼고 본문만 붙여넣어도 됩니다.\n예) 졸업 프로젝트에서 팀장을 맡아 응답 시간을 40% 줄였습니다…"}
                        />
                        <DocField
                          id="resume"
                          label="이력서"
                          hint="(학력·경험·기술·자격증)"
                          value={docs.resume}
                          onChange={(v) => setDocs((d) => ({ ...d, resume: v }))}
                          onBlur={redact}
                          placeholder={"한 줄에 하나씩 적으면 더 정확해요.\n예) 기술: React, TypeScript\n프로젝트: 캠퍼스 중고거래 앱 (2024.03~2024.08) - 팀장\n자격증: 정보처리기사"}
                        />
                        <div className="rounded-lg bg-surface-2 px-4 py-3 text-[12px] leading-relaxed text-muted">
                          <p>
                            이메일, 전화번호, 주민번호, 링크는 자동으로 가립니다{masked > 0 ? ` (지금 ${masked}개 가림)` : ""}. 이름과 주소, 학교명은 직접 지워 주세요.
                          </p>
                          <p className="mt-1">서류는 질문을 만들 때만 면접관에게 보내고, 서버나 면접 기록에는 남기지 않습니다.</p>
                        </div>
                        <Toggle label="이 브라우저에 서류 기억하기" description="다음 면접에서 다시 붙여넣지 않아도 돼요. 이 기기에만 저장됩니다." checked={remember} onChange={setRemember} />
                      </Card>
                    )}

                    {COMPANIES.length > 0 && (
                      <Card title="지원 기업" aside={<span className="text-[12px] font-normal text-faint">선택</span>}>
                        <CompanyPicker companyId={c.companyId} track={c.companyTrack} onChange={(id, track) => setC(withCompanyDefaults(c, id, track))} />
                      </Card>
                    )}

                    <Card title="채용공고 · 직무기술서" aside={<span className="text-[12px] font-normal text-faint">선택</span>}>
                      {jdOpen ? (
                        <div>
                          <textarea
                            id="jd"
                            aria-label="채용공고 · 직무기술서"
                            value={c.jobDescription}
                            onChange={(e) => set("jobDescription", e.target.value.slice(0, LIMITS.jobDescription))}
                            rows={4}
                            placeholder="지원하는 공고의 자격요건·우대사항을 붙여넣으면 그 요건을 실제 경험으로 검증하는 질문이 나옵니다. (예: GA4·SQL 활용 능력, B2B 영업 경험 우대)"
                            className="w-full resize-y rounded-lg border border-line-strong bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
                          />
                          <JdPreview jd={c.jobDescription} />
                          <p className="mt-1.5 flex justify-between text-[12px] text-faint">
                            <span>질문을 맞추는 데에만 사용됩니다.</span>
                            <span>
                              {c.jobDescription.length}/{LIMITS.jobDescription}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setJdOpen(true)} className="w-full rounded-lg border border-dashed border-line-strong px-4 py-3 text-left text-[13px] text-muted hover:border-accent/40 hover:text-ink">
                          + 공고의 자격요건을 붙여넣으면 그 요건을 검증하는 질문이 나와요
                        </button>
                      )}
                    </Card>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div role="radiogroup" aria-label="면접 방식" className="grid gap-3 sm:grid-cols-2">
                      {STYLES.map((s) => (
                        <ChoiceCard key={s.key} checked={style === s.key} onClick={() => setC((p) => ({ ...p, ...s.set }))} title={s.title} desc={s.desc} tag={s.tag} />
                      ))}
                    </div>
                    {!style && <p className="text-[12px] text-faint">세부 설정에서 직접 조정한 구성입니다.</p>}

                    <FollowUpPath config={c} />

                    <Card title="면접 분량">
                      <Segmented label="메인 질문 수 (꼬리질문은 답변에 따라 추가)" value={c.questionLimit} onChange={(v) => set("questionLimit", v)} options={QUESTION_LENGTHS.map((v) => ({ value: v, label: `${v}문항`, hint: `약 ${Math.round(v * 2.5)}분` }))} />
                    </Card>

                    <section className="rounded-xl border border-line bg-surface">
                      <button type="button" aria-expanded={details} onClick={() => setDetails((d) => !d)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6">
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-ink">세부 설정</span>
                          <span className="mt-0.5 block text-[12px] text-faint">
                            {INTERVIEW_TYPE_KO[c.interviewType]}, {DIFFICULTY_KO[c.difficulty]} 난이도, {PERSONA_KO[c.persona]} 면접관, {c.language === "ko" ? "한국어" : "영어"}, 답변 시간 {c.answerTimeLimit ? `${c.answerTimeLimit / 60}분` : "제한 없음"}, 음성 {c.voiceEnabled && ttsOk ? "켜짐" : "꺼짐"}
                          </span>
                        </span>
                        <ChevronIcon width={18} height={18} className={`shrink-0 text-faint transition-transform ${details ? "rotate-180" : ""}`} />
                      </button>
                      {details && (
                        <div className="space-y-6 border-t border-line px-5 py-5 sm:px-6">
                          <Segmented label="면접 유형" value={c.interviewType} onChange={(v) => set("interviewType", v)} columns={5} options={INTERVIEW_TYPES.map((v) => ({ value: v, label: INTERVIEW_TYPE_KO[v], hint: INTERVIEW_TYPE_HINT_KO[v] }))} />
                          <div className="grid gap-6 sm:grid-cols-2">
                            <Segmented label="난이도" value={c.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFICULTIES.map((v) => ({ value: v, label: DIFFICULTY_KO[v], hint: DIFFICULTY_HINT[v] }))} />
                            <Segmented label="면접관 스타일" value={c.persona} onChange={(v) => set("persona", v)} columns={4} options={PERSONAS.map((v) => ({ value: v, label: PERSONA_KO[v] }))} />
                          </div>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <Segmented label="면접 언어" value={c.language} onChange={(v) => set("language", v)} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "영어 면접" }]} />
                            <Segmented label="문항당 답변 시간" value={c.answerTimeLimit} onChange={(v) => set("answerTimeLimit", v)} options={ANSWER_TIME_OPTIONS} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Toggle
                              label="면접관 음성"
                              description={!ttsOk ? "이 브라우저는 음성 출력을 지원하지 않아요" : isNeuralTts() ? "면접관마다 다른 목소리로 읽어 줍니다" : "면접관이 질문을 소리 내어 읽어 줍니다"}
                              checked={c.voiceEnabled && ttsOk}
                              onChange={(v) => set("voiceEnabled", v)}
                              disabled={!ttsOk}
                            />
                            <Toggle label="실시간 피드백" description="면접 기록에 문항별 점수를 바로 표시" checked={c.liveFeedback} onChange={(v) => set("liveFeedback", v)} />
                          </div>
                        </div>
                      )}
                    </section>
                    <p className="text-[12px] leading-relaxed text-faint">
                      {isSpeechRecognitionSupported() ? "마이크는 [음성 답변] 버튼을 누를 때만 켜집니다." : "이 브라우저는 음성 답변을 지원하지 않아 텍스트로 답변합니다."} 카메라는 사용하지 않습니다.
                    </p>
                    {needsConsent && (
                      <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink">
                        <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                        <span>
                          (필수) AI 면접관이 질문하고 채점할 수 있도록 면접 답변{docMode ? "과 서류가" : "이"} Anthropic(미국)으로 전송되는 데 동의합니다. 서버에는 저장하지 않습니다.{" "}
                          <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
                            개인정보처리방침
                          </a>
                        </span>
                      </label>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* step navigation: a fixed bar on phones, inline below the step on larger screens */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
              <p className={`mb-2 truncate text-center text-[12px] sm:hidden ${blocker ? "text-warn" : "text-muted"}`}>{blocker || summaryLine}</p>
              <div className="flex gap-2 sm:items-center">
                {step > 0 && (
                  <Button size="lg" onClick={() => setStep(step - 1)} className="shrink-0 px-5 sm:px-6">
                    이전
                  </Button>
                )}
                <Button type="submit" variant="primary" size="lg" disabled={!canNext} className="min-w-0 flex-1 sm:flex-none sm:px-10">
                  {nextLabel}
                </Button>
                {blocker && <span className="hidden text-[13px] text-warn sm:inline">{blocker}</span>}
              </div>
            </div>
          </form>

          {/* desktop: sticky application summary; each row jumps to its step */}
          <aside className="sticky top-20 hidden lg:block" aria-label="접수 요약">
            <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-sm">
              <div className="bg-navy px-5 py-3 text-[14px] font-bold text-white">접수 요약</div>
              <ul className="divide-y divide-line text-[13px]">
                {summaryRows.map(([k, v, s]) => (
                  <li key={k}>
                    <button type="button" disabled={!reachable(s) || s === step} onClick={() => setStep(s)} className="flex w-full gap-3 px-5 py-2.5 text-left enabled:hover:bg-surface-2">
                      <span className="w-16 shrink-0 text-faint">{k}</span>
                      <span className="min-w-0 flex-1 font-semibold break-keep text-ink">{v}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line p-4">
                <Button variant="primary" size="lg" disabled={!roleOk || !docsOk || (needsConsent && !consented)} onClick={start} className="w-full">
                  {last ? "접수하고 대기실로 이동" : "이대로 바로 시작"}
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

/** What the panel will check from the pasted posting, so the candidate sees it was read. */
function JdPreview({ jd }: { jd: string }) {
  const reqs = useMemo(() => jdRequirements(jd), [jd]);
  if (!jd.trim()) return null;
  if (!reqs.length)
    return <p className="mt-2 text-[12px] text-faint">요건 문장을 찾지 못했습니다. ‘~ 경험’, ‘~ 능력’, ‘~ 우대’처럼 적힌 줄이 있으면 그 요건을 확인하는 질문이 나옵니다.</p>;
  return (
    <div className="mt-2 rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="text-[12px] font-semibold text-muted">면접관이 확인할 요건</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {reqs.map((r) => (
          <li key={r.text} className="rounded-md border border-line bg-surface px-2 py-0.5 text-[12px] text-ink">
            {r.text} <span className="text-faint">{r.preferred ? "우대" : "필수"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-faint">면접이 끝나면 평가표에서 요건마다 답변으로 보여 줬는지 확인합니다.</p>
    </div>
  );
}
