import { lazy, Suspense, useState } from "react";
import { InterviewHistory } from "../components/InterviewHistory";
const ScoreTrend = lazy(() => import("../components/ScoreTrend").then((m) => ({ default: m.ScoreTrend })));
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import type { InterviewSummary } from "../types/interview";

interface Props {
  history: InterviewSummary[];
  onOpen: (id: string) => void;
  canOpen: (id: string) => boolean;
  onStart: () => void;
  onHome: () => void;
  onClear: () => void;
  onNotes: () => void;
}

export function HistoryPage({ history, onOpen, canOpen, onStart, onHome, onClear, onNotes }: Props) {
  const [confirm, setConfirm] = useState(false);
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : null;
  const best = history.length ? Math.max(...history.map((h) => h.score)) : null;
  return (
    <div className="min-h-dvh pb-16">
      <TopBar
        onHome={onHome}
        right={
          <>
            {history.length > 0 && (
              <Button size="sm" variant="ghost" onClick={onNotes}>
                답변 노트
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={onStart}>
              새 면접 보기
            </Button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
          <div>
            <p className="text-sm font-semibold text-accent">나의 면접 기록</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-navy">응시한 모의면접</h1>
          </div>
          {avg !== null && (
            <dl className="flex gap-6 text-[13px] text-muted lg:hidden">
              <Stats count={history.length} avg={avg} best={best} />
            </dl>
          )}
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <div className="min-w-0">
            {history.length >= 2 && (
              <div className="mb-5 lg:hidden">
                <Suspense fallback={<div className="h-[250px] rounded-xl border border-line bg-surface" />}>
                  <ScoreTrend history={history} />
                </Suspense>
              </div>
            )}
            <InterviewHistory items={history} onOpen={onOpen} onStart={onStart} canOpen={canOpen} />
            {history.length > 0 && (
              <div className="mt-5 flex items-center justify-between gap-4 text-[12px] text-faint">
                <span>기록은 이 브라우저(localStorage)에만 저장됩니다. 최근 10회는 평가표 전체가 보관됩니다.</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
                  기록 삭제
                </Button>
              </div>
            )}
          </div>
          {avg !== null && (
            <aside className="sticky top-20 hidden space-y-3 lg:block" aria-label="기록 요약">
              <dl className="grid grid-cols-3 rounded-xl border border-line bg-surface px-4 py-4 text-[13px] text-muted">
                <Stats count={history.length} avg={avg} best={best} />
              </dl>
              {history.length >= 2 && (
                <Suspense fallback={<div className="h-[250px] rounded-xl border border-line bg-surface" />}>
                  <ScoreTrend history={history} />
                </Suspense>
              )}
              <button type="button" onClick={onNotes} className="block w-full rounded-xl border border-line bg-surface p-4 text-left hover:border-line-strong">
                <span className="text-[14px] font-bold text-navy">답변 노트</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-muted">면접마다 받은 질문을 모아 두었습니다. 점수가 낮았던 질문부터 다시 보고, 실전에서 말할 답을 적어 두세요.</span>
              </button>
            </aside>
          )}
        </div>
      </main>
      <Dialog
        open={confirm}
        title="모든 기록을 삭제할까요?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              취소
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onClear();
                setConfirm(false);
              }}
            >
              전체 삭제
            </Button>
          </>
        }
      >
        이 브라우저에 저장된 모든 면접 기록, 설정, 답변 노트에 적은 답이 삭제되며, 되돌릴 수 없습니다.
      </Dialog>
    </div>
  );
}

function Stats({ count, avg, best }: { count: number; avg: number; best: number | null }) {
  return (
    <>
      {[
        [count, "응시 횟수"],
        [avg, "평균 점수"],
        [best, "최고 점수"],
      ].map(([v, k]) => (
        <div key={k}>
          <dd className="tabular-nums text-xl font-semibold text-ink">{v}</dd>
          <dt>{k}</dt>
        </div>
      ))}
    </>
  );
}
