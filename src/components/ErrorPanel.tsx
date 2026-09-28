import { motion } from "framer-motion";
import type { InterviewError } from "../state/interviewMachine";
import { Button } from "./ui/Button";

const COPY: Record<string, { title: string; body: string }> = {
  network: { title: "Connection lost", body: "We couldn't reach the AI interviewer. Check your connection and retry." },
  timeout: { title: "The AI is taking too long", body: "The response timed out. You can retry or continue in Mock Mode." },
  unavailable: { title: "AI unavailable", body: "The AI service isn't configured or is temporarily unavailable." },
  rate_limited: { title: "Too many requests", body: "Please wait a moment, then retry." },
  parse: { title: "Unexpected AI response", body: "The AI returned something we couldn't read safely. Retrying usually fixes it." },
  refusal: { title: "The AI declined", body: "The AI couldn't respond to this answer. Retry or continue in Mock Mode." },
  server: { title: "AI service error", body: "The AI service returned an error. Retry, or continue in Mock Mode." },
  injected: { title: "Simulated error", body: "Debug: this failure was injected to test error handling." },
};

interface Props {
  error: InterviewError;
  canUseMock: boolean;
  onRetry: () => void;
  onMock: () => void;
}

export function ErrorPanel({ error, canUseMock, onRetry, onMock }: Props) {
  const c = COPY[error.kind] ?? { title: "Something went wrong", body: error.message };
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-2xl border border-warn/25 bg-surface p-6 text-center"
    >
      <p className="label text-warn">Interview paused</p>
      <h2 className="mt-2 text-lg font-semibold text-ink">{c.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
      <p className="mt-1 text-xs text-faint">Your answers so far are kept.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="md" onClick={onRetry}>
          Retry
        </Button>
        {canUseMock && (
          <Button variant="secondary" size="md" onClick={onMock}>
            Continue in Mock Mode
          </Button>
        )}
      </div>
    </motion.div>
  );
}
