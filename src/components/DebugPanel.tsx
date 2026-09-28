import { useState } from "react";
import type { InterviewController } from "../hooks/useInterview";
import { currentQuestion } from "../state/interviewMachine";
import { overallScore } from "../utils/scoring";

/** Developer panel — only rendered with ?debug=true. */
export function DebugPanel({ ctl, onClearData }: { ctl: InterviewController; onClearData: () => void }) {
  const [open, setOpen] = useState(true);
  const { state, status, tokens, debug, actions, fallbackActive, providerLabel } = ctl;
  const q = currentQuestion(state);
  const score = state.interview ? overallScore(state.interview.questions) : null;
  const inInterview = ["ASKING", "LISTENING"].includes(state.phase);

  const rows: [string, string][] = [
    ["MODE", fallbackActive ? "MOCK (fallback)" : (status?.mode ?? "…").toUpperCase()],
    ["AI PROVIDER", providerLabel],
    ["INTERVIEW STATE", `${state.phase}${state.stage ? ` · ${state.stage}` : ""}`],
    ["QUESTION INDEX", state.interview ? `${state.interview.questions.length} / ${state.interview.config.questionLimit}` : "—"],
    ["CURRENT QUESTION", q ? `${q.isFollowUp ? "↳ " : ""}[${q.type}] ${q.text}` : "—"],
    ["CURRENT SCORE", score === null ? "—" : String(score)],
    ["TOKEN STATUS", tokens.calls ? `${tokens.calls} calls · in ${tokens.inputTokens} · out ${tokens.outputTokens}` : status?.mode === "ai" ? "0 calls" : "n/a (mock)"],
  ];

  const btn = "rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] text-white hover:bg-white/15 disabled:opacity-30";

  return (
    <div className="no-print fixed right-3 bottom-3 z-[70] w-[300px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-warn/30 bg-[#0f141f]/95 font-mono text-[11px] text-white shadow-2xl backdrop-blur">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-[#f2c14e]">
        <span>DEBUG</span>
        <span>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 p-3">
          <dl className="space-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[92px_1fr] gap-2">
                <dt className="text-white/50">{k}</dt>
                <dd className="line-clamp-2 break-words text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-1.5">
            <button className={btn} disabled={!inInterview} onClick={debug.nextQuestion}>Next Question</button>
            <button className={btn} disabled={!state.interview} onClick={debug.triggerFollowUp}>Trigger Follow-up</button>
            <button className={btn} disabled={!inInterview} onClick={() => debug.simulateAnswer("excellent")}>Mock Excellent</button>
            <button className={btn} disabled={!inInterview} onClick={() => debug.simulateAnswer("poor")}>Mock Poor</button>
            <button className={btn} disabled={!inInterview} onClick={debug.completeNow}>Complete Interview</button>
            <button className={btn} onClick={actions.reset}>Reset Interview</button>
            <button className={btn} onClick={onClearData}>Clear Local Data</button>
            <button className={btn} onClick={debug.testVoice}>Test Voice</button>
            <button className={`${btn} col-span-2`} onClick={debug.testError}>Test Error (fail next AI call)</button>
          </div>
        </div>
      )}
    </div>
  );
}
