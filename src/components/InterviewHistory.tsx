import { INTERVIEW_TYPE_LABEL } from "../../shared/labels";
import type { InterviewSummary } from "../types/interview";
import { durationLabel, pad2, shortDate } from "../utils/format";
import { scoreTone } from "../utils/scoring";
import { TONE_TEXT } from "../utils/tones";
import { Button } from "./ui/Button";
import { ChevronIcon } from "./ui/icons";

interface Props {
  items: InterviewSummary[];
  onOpen: (id: string) => void;
  onStart: () => void;
  canOpen: (id: string) => boolean;
  compact?: boolean;
}

export function InterviewHistory({ items, onOpen, onStart, canOpen, compact }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="font-mono text-xs tracking-[0.24em] text-faint">NO INTERVIEW YET</p>
        <p className="mt-2 text-sm text-muted">Your completed interviews will appear here. They're stored only in this browser.</p>
        <Button variant="secondary" className="mt-5" onClick={onStart}>
          Start your first interview
        </Button>
      </div>
    );
  }
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {items.map((s, idx) => {
        const openable = canOpen(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!openable}
              onClick={() => onOpen(s.id)}
              className="flex w-full items-center gap-4 bg-surface/50 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-surface/50 sm:px-5"
            >
              <span className="font-mono text-xs text-faint">{pad2(idx + 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{s.position}</span>
                <span className="mt-0.5 block text-xs text-faint">
                  {INTERVIEW_TYPE_LABEL[s.interviewType]} · {s.questionCount} Q{!compact && ` · ${durationLabel(s.duration)}`}
                </span>
              </span>
              <span className="text-right">
                <span className={`block font-mono text-xl tabular-nums ${TONE_TEXT[scoreTone(s.score)]}`}>{s.score}</span>
                <span className="block font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{shortDate(s.createdAt)}</span>
              </span>
              {openable && <ChevronIcon className="text-faint" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
