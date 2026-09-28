import type { ReactNode } from "react";

export function TopBar({ onHome, right, modeBadge }: { onHome: () => void; right?: ReactNode; modeBadge?: ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-2.5" aria-label="INTERVIEW//AI 홈">
          <span className="font-mono text-sm font-semibold tracking-[0.16em] text-navy">
            INTERVIEW<span className="text-accent-2">//</span>AI
          </span>
          <span className="hidden text-[13px] text-faint md:inline">모의면접센터</span>
        </button>
        {modeBadge}
        <nav className="ml-auto flex items-center gap-1.5">{right}</nav>
      </div>
    </header>
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
