import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, INTERVIEW_TYPE_LABEL } from "../../shared/labels";
import { CategoryBars } from "../components/CategoryBars";
import { FeedbackCard } from "../components/FeedbackCard";
import { ScoreChart } from "../components/ScoreChart";
import { ScoreRing } from "../components/ScoreRing";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { DownloadIcon, ShareIcon } from "../components/ui/icons";
import { DISCLAIMER, INTERVIEWER_NAME } from "../config/options";
import type { Interview } from "../types/interview";
import { durationLabel, longDate } from "../utils/format";
import { downloadReport } from "../utils/report";
import { strongestAndWeakest } from "../utils/scoring";
import { shareResult } from "../utils/shareCard";
import { loadInterview, previousFor } from "../utils/storage";

interface Props {
  interview: Interview;
  fromHistory: boolean;
  storageOk: boolean;
  onNew: () => void;
  onHistory: () => void;
  onHome: () => void;
}

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: "easeOut" as const },
});

export function ResultPage({ interview: i, fromHistory, storageOk, onNew, onHistory, onHome }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scores = i.categoryScores!;
  const { strongest, weakest } = strongestAndWeakest(scores);
  const r = i.report;
  const previous = useMemo(() => previousFor(i), [i]);
  const previousScores = useMemo(() => (previous ? loadInterview(previous.id)?.categoryScores ?? null : null), [previous]);
  const delta = previous ? (i.overallScore ?? 0) - previous.score : null;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const share = async () => {
    const res = await shareResult(i);
    flash(res === "shared" ? "Shared." : res === "downloaded" ? "Result card saved as an image." : res === "copied" ? "Result summary copied." : "Sharing isn't available here.");
  };

  return (
    <div className="min-h-dvh pb-20">
      <TopBar
        onHome={onHome}
        right={
          <>
            <Button size="sm" variant="ghost" onClick={onHistory}>
              History
            </Button>
            <Button size="sm" variant="secondary" onClick={onNew}>
              New interview
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* hero */}
        <section className="flex flex-col items-center pt-6 text-center sm:pt-10">
          <motion.p {...reveal(0)} className="label text-accent">
            {fromHistory ? "Interview report" : "Interview complete"}
          </motion.p>
          <motion.p {...reveal(0.05)} className="mt-2 text-sm text-muted">
            {i.config.position} · {INTERVIEW_TYPE_LABEL[i.config.interviewType]} · {DIFFICULTY_LABEL[i.config.difficulty]} · {longDate(i.createdAt)} · {durationLabel(i.duration)}
          </motion.p>
          <motion.div {...reveal(0.15)} className="mt-8">
            <p className="label mb-3">Overall</p>
            <ScoreRing score={i.overallScore ?? 0} size={210} />
          </motion.div>
          {r && (
            <motion.div {...reveal(0.9)} className="mt-6 max-w-2xl">
              <p className="text-lg text-ink sm:text-xl">{r.headline}</p>
              <p className="mt-3 text-sm text-faint">
                <span className="font-mono tracking-[0.2em]">{INTERVIEWER_NAME}</span> — “{r.closingRemark}”
              </p>
            </motion.div>
          )}
          {i.endedEarly && <p className="mt-3 text-xs text-warn">Ended early — based on {i.questions.length} answered question(s).</p>}
        </section>

        {/* scores */}
        <motion.section {...reveal(0.4)} className="mt-12 grid gap-6 lg:grid-cols-2" aria-label="Category scores">
          <div className="rounded-3xl border border-line bg-surface/70 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="label">Score profile</h2>
              {previousScores && (
                <span className="flex items-center gap-3 text-[11px] text-faint">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" />Current</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-faint" />Previous</span>
                </span>
              )}
            </div>
            <ScoreChart scores={scores} previous={previousScores} />
          </div>
          <div className="rounded-3xl border border-line bg-surface/70 p-5 sm:p-7">
            <h2 className="label mb-5">Categories</h2>
            <CategoryBars scores={scores} highlight={{ strongest, weakest }} />
          </div>
        </motion.section>

        {/* highlights */}
        <motion.section {...reveal(0.55)} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-good/20 bg-good/[0.04] p-5">
            <p className="label text-good/80">Strongest area</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{CATEGORY_LABEL[strongest]}</p>
            <p className="mt-1 font-mono text-sm text-good">{scores[strongest]}</p>
          </div>
          <div className="rounded-2xl border border-warn/20 bg-warn/[0.04] p-5">
            <p className="label text-warn/80">Needs improvement</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{CATEGORY_LABEL[weakest]}</p>
            <p className="mt-1 font-mono text-sm text-warn">{scores[weakest]}</p>
          </div>
          <div className="rounded-2xl border border-accent/25 bg-accent-soft/40 p-5 sm:col-span-2 lg:col-span-1">
            <p className="label text-accent">Top feedback</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{r?.topFeedback ?? "—"}</p>
          </div>
        </motion.section>

        {/* comparison */}
        {previous && delta !== null && (
          <motion.section {...reveal(0.65)} className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-surface/60 px-5 py-4">
            <p className="label">Compared with previous</p>
            <div className="flex items-center gap-6 font-mono">
              <span className="text-sm text-muted">
                Previous <span className="ml-1 text-lg text-ink">{previous.score}</span>
              </span>
              <span className="text-sm text-muted">
                Current <span className="ml-1 text-lg text-ink">{i.overallScore}</span>
              </span>
              <span className={`text-lg ${delta > 0 ? "text-good" : delta < 0 ? "text-warn" : "text-muted"}`}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>
            <p className="text-xs text-faint sm:ml-auto">
              vs. {previous.position} on {longDate(previous.createdAt)}. Score differences vary by questions asked — not a definitive measure of improvement.
            </p>
          </motion.section>
        )}

        {/* narrative */}
        {r && (
          <motion.section {...reveal(0.7)} className="mt-10 grid gap-6 md:grid-cols-3" lang={i.config.language}>
            {[
              { title: "Strengths", items: r.strengths, dot: "bg-good" },
              { title: "Improvements", items: r.improvements, dot: "bg-warn" },
              { title: "Next steps", items: r.nextSteps, dot: "bg-accent" },
            ].map((b) => (
              <div key={b.title}>
                <h2 className="label mb-3">{b.title}</h2>
                <ul className="space-y-2.5">
                  {b.items.map((x) => (
                    <li key={x} className="flex gap-2.5 text-sm leading-relaxed text-ink/90">
                      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.section>
        )}

        {/* question review */}
        <section className="mt-12" aria-label="Question review" lang={i.config.language}>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="label">Question review</h2>
            <span className="text-xs text-faint">Tap a question for your answer, feedback and how to improve</span>
          </div>
          <ol className="space-y-2.5">
            {i.questions.map((q, idx) => (
              <FeedbackCard key={q.id} q={q} index={idx + 1} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)} />
            ))}
          </ol>
        </section>

        {/* actions */}
        <section className="no-print mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => downloadReport(i)} icon={<DownloadIcon width={16} height={16} />}>
            Download report
          </Button>
          <Button variant="secondary" onClick={share} icon={<ShareIcon width={16} height={16} />}>
            Share result
          </Button>
          <Button variant="primary" onClick={onNew}>
            Start new interview
          </Button>
        </section>
        <p className="mt-3 text-center text-[11px] text-faint">Shared cards include only position, score and top strength — never your answers.</p>

        {!storageOk && <p className="mt-6 text-center text-xs text-warn">This interview couldn't be saved to local history (browser storage unavailable).</p>}
        <p className="mt-10 text-center text-xs text-faint">{DISCLAIMER}</p>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line-strong bg-surface-2 px-4 py-2 text-sm text-ink shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
