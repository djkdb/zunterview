import { useState } from "react";
import { InterviewHistory } from "../components/InterviewHistory";
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
}

export function HistoryPage({ history, onOpen, canOpen, onStart, onHome, onClear }: Props) {
  const [confirm, setConfirm] = useState(false);
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : null;
  const best = history.length ? Math.max(...history.map((h) => h.score)) : null;
  return (
    <div className="min-h-dvh pb-16">
      <TopBar
        onHome={onHome}
        right={
          <Button size="sm" variant="primary" onClick={onStart}>
            새 면접 보기
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
          <div>
            <p className="text-sm font-semibold text-accent">나의 면접 기록</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-navy">응시한 모의면접</h1>
          </div>
          {avg !== null && (
            <dl className="flex gap-6 text-[13px] text-muted">
              <div>
                <dd className="font-mono text-xl font-semibold text-ink">{history.length}</dd>
                <dt>응시 횟수</dt>
              </div>
              <div>
                <dd className="font-mono text-xl font-semibold text-ink">{avg}</dd>
                <dt>평균 점수</dt>
              </div>
              <div>
                <dd className="font-mono text-xl font-semibold text-ink">{best}</dd>
                <dt>최고 점수</dt>
              </div>
            </dl>
          )}
        </div>
        <InterviewHistory items={history} onOpen={onOpen} onStart={onStart} canOpen={canOpen} />
        {history.length > 0 && (
          <div className="mt-5 flex items-center justify-between gap-4 text-[12px] text-faint">
            <span>기록은 이 브라우저(localStorage)에만 저장됩니다. 최근 10회는 평가표 전체가 보관됩니다.</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              기록 삭제
            </Button>
          </div>
        )}
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
        이 브라우저에 저장된 모든 면접 기록과 설정이 삭제되며, 되돌릴 수 없습니다.
      </Dialog>
    </div>
  );
}
