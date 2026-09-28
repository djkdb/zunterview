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
  return (
    <div className="min-h-dvh pb-16">
      <TopBar
        onHome={onHome}
        right={
          <Button size="sm" variant="secondary" onClick={onStart}>
            New interview
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
          <div>
            <p className="label text-accent">History</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Recent interviews</h1>
          </div>
          {avg !== null && (
            <div className="flex gap-6 font-mono text-xs text-faint">
              <span>
                <span className="block text-xl text-ink">{history.length}</span>INTERVIEWS
              </span>
              <span>
                <span className="block text-xl text-ink">{avg}</span>AVG SCORE
              </span>
            </div>
          )}
        </div>
        <InterviewHistory items={history} onOpen={onOpen} onStart={onStart} canOpen={canOpen} />
        {history.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-xs text-faint">
            <span>Stored only in this browser (localStorage). Full reports are kept for the 10 most recent.</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              Clear
            </Button>
          </div>
        )}
      </main>
      <Dialog
        open={confirm}
        title="Clear local data?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onClear();
                setConfirm(false);
              }}
            >
              Clear all
            </Button>
          </>
        }
      >
        This removes all saved interviews and settings from this browser. This can't be undone.
      </Dialog>
    </div>
  );
}
