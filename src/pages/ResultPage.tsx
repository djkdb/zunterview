import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { FeedbackCard } from "../components/FeedbackCard";
import { ScoreChart } from "../components/ScoreChart";
import { ScoreRing } from "../components/ScoreRing";
import { Stamp } from "../components/Stamp";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { DownloadIcon, ShareIcon } from "../components/ui/icons";
import { CATEGORY_DESC_KO, CATEGORY_KO, DIFFICULTY_KO, EXPERIENCE_KO, INTERVIEW_TYPE_KO, grade } from "../config/labelsKo";
import { DISCLAIMER } from "../config/options";
import { applicantNumber, buildPanel, seatFor } from "../config/panel";
import { getCompany } from "../../shared/companies";
import type { Interview } from "../types/interview";
import { durationLabel, longDate } from "../utils/format";
import { downloadReport } from "../utils/report";
import { scoreTone, strongestAndWeakest } from "../utils/scoring";
import { shareResult } from "../utils/shareCard";
import { loadInterview, previousFor } from "../utils/storage";
import { TONE_BG, TONE_TEXT } from "../utils/tones";

interface Props {
  interview: Interview;
  fromHistory: boolean;
  storageOk: boolean;
  onNew: () => void;
  /** Start again immediately with the same settings. */
  onRetake: () => void;
  onHistory: () => void;
  onHome: () => void;
}

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: "easeOut" as const },
});

function SheetSection({ no, title, children, delay = 0 }: { no: number; title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section {...reveal(delay)} className="mt-8">
      <h2 className="mb-3 border-b-2 border-navy pb-1.5 text-[15px] font-extrabold text-navy">
        {no}. {title}
      </h2>
      {children}
    </motion.section>
  );
}

export function ResultPage({ interview: i, fromHistory, storageOk, onNew, onRetake, onHistory, onHome }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const panel = useMemo(() => buildPanel(i.config), [i.config]);
  const scores = i.categoryScores!;
  const overall = i.overallScore ?? 0;
  const { strongest, weakest } = strongestAndWeakest(scores);
  const r = i.report;
  const previous = useMemo(() => previousFor(i), [i]);
  const previousScores = useMemo(() => (previous ? (loadInterview(previous.id)?.categoryScores ?? null) : null), [previous]);
  const delta = previous ? overall - previous.score : null;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  const share = async () => {
    const res = await shareResult(i);
    flash(res === "shared" ? "공유했습니다." : res === "downloaded" ? "결과 카드 이미지를 저장했습니다." : res === "copied" ? "결과 요약을 복사했습니다." : "이 환경에서는 공유할 수 없습니다.");
  };

  const company = getCompany(i.config.companyId);
  const info: [string, ReactNode][] = [
    ["지원번호", applicantNumber(i.id)],
    ["지원 직무", company ? `${company.name} · ${i.config.position}` : i.config.position],
    ["면접 유형", `${INTERVIEW_TYPE_KO[i.config.interviewType]} · ${DIFFICULTY_KO[i.config.difficulty]}`],
    ["경력 구분", EXPERIENCE_KO[i.config.experience]],
    ["면접 일시", longDate(i.createdAt)],
    ["소요 시간", durationLabel(i.duration)],
    ["면접 위원", `${panel.center.name}(위원장) · ${panel.left.name} · ${panel.right.name}`],
    ["답변 문항", `메인 ${i.questions.filter((q) => !q.isFollowUp).length} / ${i.config.questionLimit}문항 · 꼬리질문 ${i.questions.filter((q) => q.isFollowUp).length}${i.endedEarly ? " (조기 종료)" : ""}`],
  ];

  return (
    <div className="min-h-dvh pb-20">
      <TopBar
        onHome={onHome}
        right={
          <>
            <Button size="sm" variant="ghost" onClick={onHistory}>
              <span className="hidden sm:inline">나의 </span>면접 기록
            </Button>
            <Button size="sm" variant="primary" onClick={onNew}>
              새 면접<span className="hidden sm:inline"> 보기</span>
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-4xl px-3 pt-6 sm:px-6 sm:pt-10">
        {!fromHistory && (
          <motion.p {...reveal(0)} className="no-print mb-4 text-center text-sm text-muted">
            수고하셨습니다. 면접위원이 작성한 평가표입니다.
          </motion.p>
        )}

        {/* the evaluation sheet */}
        <motion.article {...reveal(0.05)} className="relative rounded-sm border border-line-strong bg-surface px-4 py-7 shadow-[0_18px_50px_-24px_rgba(15,27,46,0.35)] sm:px-10 sm:py-10">
          <Stamp className="absolute top-3 right-3 sm:top-8 sm:right-10" />
          <p className="font-mono text-[11px] tracking-[0.2em] text-faint">INTERVIEW//AI 모의면접센터</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[0.3em] text-navy sm:text-3xl">모의면접 평가표</h1>

          <dl className="mt-6 grid grid-cols-[84px_1fr] border-t border-l border-line text-[13px] sm:grid-cols-[96px_1fr_96px_1fr] sm:text-[14px]">
            {info.map(([k, v]) => (
              <FragmentRow key={k} k={k} v={v} />
            ))}
          </dl>

          <SheetSection no={1} title="종합 평가" delay={0.15}>
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-5">
                <ScoreRing score={overall} size={160} />
                <div className="text-center">
                  <p className="label">종합 등급</p>
                  <p className="mt-1 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-navy font-mono text-3xl font-bold text-navy">{grade(overall)}</p>
                </div>
              </div>
              <div>
                {r && <p className="text-[17px] leading-relaxed font-bold text-ink">{r.headline}</p>}
                {company && company.talent.length > 0 && (
                  <p className="mt-2 text-[13px] text-muted">
                    {company.name} 인재상: {company.talent.slice(0, 5).map((t) => t.split(/[:(]/)[0].trim()).filter(Boolean).join(" · ")} — 답변에 이 키워드가 드러나는 경험을 연결해 보세요.
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-lg border border-good/25 bg-good/[0.05] px-3 py-2">
                    <p className="text-faint">가장 우수한 항목</p>
                    <p className="font-bold text-good">
                      {CATEGORY_KO[strongest]} {scores[strongest]}
                    </p>
                  </div>
                  <div className="rounded-lg border border-warn/25 bg-warn/[0.05] px-3 py-2">
                    <p className="text-faint">보완이 필요한 항목</p>
                    <p className="font-bold text-warn">
                      {CATEGORY_KO[weakest]} {scores[weakest]}
                    </p>
                  </div>
                </div>
                {previous && delta !== null && (
                  <p className="mt-3 text-[13px] text-muted">
                    지난 면접 대비{" "}
                    <span className="font-mono">
                      {previous.score} → {overall}
                    </span>{" "}
                    <b className={delta > 0 ? "text-good" : delta < 0 ? "text-warn" : "text-muted"}>({delta > 0 ? `+${delta}` : delta})</b>
                    <span className="block text-[12px] text-faint">질문 구성이 달라 점수 차이가 실력 변화를 그대로 뜻하지는 않습니다.</span>
                  </p>
                )}
              </div>
            </div>
          </SheetSection>

          <SheetSection no={2} title="항목별 평가" delay={0.25}>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <table className="w-full border-collapse text-[13px] sm:text-[14px]">
                <thead>
                  <tr className="bg-surface-2 text-muted">
                    <th className="border border-line px-2 py-2 text-left font-semibold">평가 항목</th>
                    <th className="hidden border border-line px-2 py-2 text-left font-semibold sm:table-cell">평가 기준</th>
                    <th className="w-14 border border-line px-2 py-2 font-semibold">점수</th>
                    <th className="w-12 border border-line px-2 py-2 font-semibold">등급</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORY_KEYS.map((k, idx) => (
                    <tr key={k}>
                      <td className="border border-line px-2 py-2">
                        <span className="font-semibold text-ink">{CATEGORY_KO[k]}</span>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <motion.div
                            className={`h-full rounded-full ${TONE_BG[scoreTone(scores[k])]}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${scores[k]}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.1 + idx * 0.06 }}
                          />
                        </div>
                      </td>
                      <td className="hidden border border-line px-2 py-2 text-muted sm:table-cell">{CATEGORY_DESC_KO[k]}</td>
                      <td className={`border border-line px-2 py-2 text-center font-mono font-semibold ${TONE_TEXT[scoreTone(scores[k])]}`}>{scores[k]}</td>
                      <td className="border border-line px-2 py-2 text-center font-bold text-ink">{grade(scores[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rounded-lg border border-line bg-surface-2/60">
                <ScoreChart scores={scores} previous={previousScores} />
                {previousScores && <p className="pb-2 text-center text-[11px] text-faint">점선: 지난 면접</p>}
              </div>
            </div>
          </SheetSection>

          {r && (
            <SheetSection no={3} title="면접위원 종합 의견" delay={0.35}>
              <div className="rounded-lg border border-line bg-surface-2/60 p-4 sm:p-5">
                <p className="text-[16px] leading-relaxed font-bold text-navy">“{r.topFeedback}”</p>
                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  {[
                    { title: "강점", items: r.strengths, dot: "bg-good" },
                    { title: "보완점", items: r.improvements, dot: "bg-warn" },
                    { title: "다음 연습 과제", items: r.nextSteps, dot: "bg-accent" },
                  ].map((b) => (
                    <div key={b.title}>
                      <h3 className="mb-2 text-[13px] font-bold text-ink">{b.title}</h3>
                      <ul className="space-y-2" lang={i.config.language}>
                        {b.items.map((x) => (
                          <li key={x} className="flex gap-2 text-[14px] leading-relaxed text-ink/90">
                            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`} />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-right text-[13px] text-muted">
                  “{r.closingRemark}” — 면접위원장 <b className="text-ink">{panel.center.name}</b>
                </p>
              </div>
            </SheetSection>
          )}

          <SheetSection no={4} title="문항별 평가" delay={0.45}>
            <p className="mb-3 text-[13px] text-faint">문항을 누르면 내 답변, 평가 근거, 개선 방향을 볼 수 있습니다.</p>
            <ol className="space-y-2" lang={i.config.language}>
              {i.questions.map((q, idx) => (
                <FeedbackCard
                  key={q.id}
                  q={q}
                  index={idx + 1}
                  open={open === q.id}
                  onToggle={() => setOpen(open === q.id ? null : q.id)}
                  asker={panel[seatFor(q.type, q.isFollowUp)]}
                />
              ))}
            </ol>
          </SheetSection>

          <p className="mt-10 border-t border-line pt-4 text-center text-[12px] leading-relaxed text-faint">
            {DISCLAIMER}
            <br />본 평가표는 연습용 자료이며 실제 기업의 채용 결과와 무관합니다.
          </p>
        </motion.article>

        <section className="no-print mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Button variant="secondary" onClick={() => downloadReport(i)} icon={<DownloadIcon width={16} height={16} />}>
            평가표 다운로드
          </Button>
          <Button variant="secondary" onClick={share} icon={<ShareIcon width={16} height={16} />}>
            결과 공유
          </Button>
          <Button variant="secondary" onClick={onNew}>
            설정 바꿔서 보기
          </Button>
          <Button variant="primary" onClick={onRetake}>
            같은 조건으로 다시 보기
          </Button>
        </section>
        <p className="no-print mt-3 text-center text-[12px] text-faint">공유 카드에는 직무·점수·강점만 담기며, 답변 내용은 포함되지 않습니다.</p>
        {!storageOk && <p className="mt-4 text-center text-[13px] text-warn">브라우저 저장소를 사용할 수 없어 이 면접은 기록에 저장되지 않았습니다.</p>}
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-navy px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function FragmentRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <>
      <dt className="border-r border-b border-line bg-surface-2 px-2.5 py-2 font-semibold whitespace-nowrap text-muted">{k}</dt>
      <dd className="border-r border-b border-line px-2.5 py-2 font-medium break-keep text-ink">{v}</dd>
    </>
  );
}
