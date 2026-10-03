import { motion } from "framer-motion";
import { mmss } from "../utils/format";
import { MuteIcon, NotesIcon, VolumeIcon } from "./ui/icons";

interface Props {
  index: number;
  total: number;
  elapsed: number;
  applicantNo: string;
  position: string;
  typeLabel: string;
  voiceOn: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  onEnd: () => void;
  canEnd: boolean;
  onOpenNotes: () => void;
  modeLabel: string;
}

/** Top bar of the interview room: applicant info, progress, elapsed time. */
export function InterviewHeader(p: Props) {
  const progress = p.total ? Math.min(1, p.index / p.total) : 0;
  return (
    <header className="sticky top-0 z-30 bg-navy text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden tabular-nums text-xs lg:inline">
            INTERVIEW<span className="text-[#7fa6e0]">//</span>AI
          </span>
          <span className="hidden h-4 w-px bg-white/20 lg:inline" />
          <span className="rounded bg-white/10 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap max-[400px]:hidden">
            <span className="hidden sm:inline">지원번호 </span>
            <span className="sm:hidden">No.</span>
            {p.applicantNo}
          </span>
          <span className="hidden min-w-0 truncate text-[13px] text-white/75 md:inline">
            {p.position} · {p.typeLabel}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="text-[13px] whitespace-nowrap text-white/80" aria-label={`${p.total}문항 중 ${p.index}번째`}>
            <span className="hidden sm:inline">문항 </span>
            <b className="tabular-nums text-white">{p.index}</b>
            <span className="tabular-nums text-white/60"> / {p.total}</span>
          </span>
          <span className="mx-0.5 h-4 w-px bg-white/20 sm:mx-1" />
          <span className="tabular-nums text-[13px] whitespace-nowrap text-white/80" aria-label="면접 경과 시간">
            <span className="hidden font-sans sm:inline">경과 </span>
            {mmss(p.elapsed)}
          </span>
          <span className="hidden rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/60 xl:inline">{p.modeLabel}</span>
          {p.voiceSupported && (
            <button
              type="button"
              onClick={p.onToggleVoice}
              aria-pressed={p.voiceOn}
              aria-label={p.voiceOn ? "면접관 음성 끄기" : "면접관 음성 켜기"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            >
              {p.voiceOn ? <VolumeIcon /> : <MuteIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={p.onOpenNotes}
            aria-label="면접 기록 보기"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <NotesIcon />
          </button>
          <button
            type="button"
            onClick={p.onEnd}
            disabled={!p.canEnd}
            className="h-9 rounded-lg border border-white/25 px-3 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-white/10 disabled:opacity-40"
          >
            면접 종료
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.index} aria-label="면접 진행률">
        <motion.div className="h-full bg-[#7fa6e0]" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </header>
  );
}
