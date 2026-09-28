import { motion } from "framer-motion";
import { mmss, pad2 } from "../utils/format";
import { Button } from "./ui/Button";
import { MuteIcon, NotesIcon, VolumeIcon } from "./ui/icons";

interface Props {
  index: number;
  total: number;
  elapsed: number;
  voiceOn: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  onEnd: () => void;
  canEnd: boolean;
  onOpenNotes: () => void;
  modeLabel: string;
}

export function InterviewHeader({ index, total, elapsed, voiceOn, voiceSupported, onToggleVoice, onEnd, canEnd, onOpenNotes, modeLabel }: Props) {
  const progress = total ? Math.min(1, index / total) : 0;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden font-mono text-xs tracking-[0.2em] text-ink sm:inline">
            INTERVIEW<span className="text-accent">//</span>AI
          </span>
          <span className="hidden h-4 w-px bg-line-strong sm:inline" />
          <span className="font-mono text-xs tracking-[0.16em] text-muted" aria-label={`Question ${index} of ${total}`}>
            QUESTION <span className="text-ink">{pad2(index)}</span> / {pad2(total)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <span className="hidden font-mono text-[10px] tracking-[0.16em] text-faint md:inline">{modeLabel}</span>
          <span className="font-mono text-xs tracking-[0.12em] text-muted tabular-nums" aria-label="Total interview time">
            <span className="hidden text-faint sm:inline">TIME </span>
            {mmss(elapsed)}
          </span>
          {voiceSupported && (
            <button
              type="button"
              onClick={onToggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? "Turn interviewer voice off" : "Turn interviewer voice on"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-ink"
            >
              {voiceOn ? <VolumeIcon /> : <MuteIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNotes}
            aria-label="Open interview notes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
          >
            <NotesIcon />
          </button>
          <Button size="sm" variant="ghost" onClick={onEnd} disabled={!canEnd} className="border border-line">
            End
          </Button>
        </div>
      </div>
      <div className="h-[2px] w-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Interview progress">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-accent-2"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </header>
  );
}
