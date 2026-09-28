import type { ReactNode } from "react";

export function TopBar({ onHome, right, modeBadge }: { onHome: () => void; right?: ReactNode; modeBadge?: ReactNode }) {
  return (
    <header className="no-print mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
      <button type="button" onClick={onHome} className="font-mono text-sm tracking-[0.2em] text-ink" aria-label="INTERVIEW//AI home">
        INTERVIEW<span className="text-accent">//</span>AI
      </button>
      {modeBadge}
      <nav className="ml-auto flex items-center gap-1.5">{right}</nav>
    </header>
  );
}

export function ModeBadge({ mode, detail }: { mode: "ai" | "mock" | null; detail?: string }) {
  if (!mode) return <span className="h-6 w-20 animate-pulse rounded-full bg-white/5" aria-hidden />;
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] sm:inline-flex ${
        mode === "ai" ? "border-accent/40 text-accent" : "border-line-strong text-muted"
      }`}
      title={detail}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${mode === "ai" ? "bg-accent" : "bg-faint"}`} />
      {mode === "ai" ? "AI MODE" : "MOCK MODE"}
    </span>
  );
}
