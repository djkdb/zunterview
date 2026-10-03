import { INTERVIEW_TYPE_KO, grade } from "../config/labelsKo";
import type { InterviewSummary } from "../types/interview";
import { durationLabel, shortDate } from "../utils/format";
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
      <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
        <p className="text-base font-bold text-ink">아직 응시한 면접이 없습니다</p>
        <p className="mt-1.5 text-sm text-muted">면접을 마치면 평가표가 이곳에 보관됩니다. 기록은 이 브라우저에만 저장돼요.</p>
        <Button variant="primary" className="mt-5" onClick={onStart}>
          면접 접수하기
        </Button>
      </div>
    );
  }
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((s, idx) => {
        const openable = canOpen(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!openable}
              onClick={() => onOpen(s.id)}
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-surface sm:px-5"
            >
              <span className="tabular-nums text-xs text-faint">{idx + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{s.company ? `${s.company} ${s.position}` : s.position}</span>
                <span className="mt-0.5 block text-[12px] text-faint">
                  {shortDate(s.createdAt)}, {INTERVIEW_TYPE_KO[s.interviewType]}{s.usedDocuments?.length ? " (서류 기반)" : ""} {s.questionCount}문항{!compact && `, ${durationLabel(s.duration)}`}
                </span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="rounded border border-line px-1.5 text-[12px] font-bold text-muted">{grade(s.score)}</span>
                <span className={`tabular-nums text-xl font-semibold ${TONE_TEXT[scoreTone(s.score)]}`}>{s.score}</span>
              </span>
              {openable && <ChevronIcon className="text-faint" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
