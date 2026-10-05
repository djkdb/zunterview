import type { ReactNode } from "react";

export function TopBar({ onHome, right, modeBadge }: { onHome: () => void; right?: ReactNode; modeBadge?: ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-2" aria-label="INTERVIEW//AI 홈">
          <Seal />
          <span className="text-[15px] font-extrabold tracking-tight text-navy">INTERVIEW//AI</span>
          <span className="hidden text-[13px] text-faint md:inline">모의면접센터</span>
        </button>
        {modeBadge}
        <nav className="ml-auto flex items-center gap-1.5">{right}</nav>
      </div>
    </header>
  );
}

/** The brand mark: a small 직인, the same red as the stamp on the evaluation sheet. */
export function Seal({ light = false }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] text-[12px] leading-none font-black ${
        light ? "border-[#e8837c] text-[#e8837c]" : "border-stamp text-stamp"
      }`}
    >
      면
    </span>
  );
}

export function ModeBadge({ mode, detail }: { mode: "ai" | "mock" | null; detail?: string }) {
  if (!mode) return <span className="h-6 w-24 animate-pulse rounded-md bg-surface-3" aria-hidden />;
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold sm:inline-flex ${
        mode === "ai" ? "border-accent/30 bg-accent-soft text-accent" : "border-line-strong text-muted"
      }`}
      title={detail}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${mode === "ai" ? "bg-good" : "bg-faint"}`} />
      {mode === "ai" ? "AI 면접관 연결됨" : "MOCK 모드"}
    </span>
  );
}
