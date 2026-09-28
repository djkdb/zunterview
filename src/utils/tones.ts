import type { ScoreTone } from "./scoring";

export const TONE_TEXT: Record<ScoreTone, string> = {
  good: "text-good",
  ok: "text-ok",
  warn: "text-warn",
  low: "text-low",
};

export const TONE_BG: Record<ScoreTone, string> = {
  good: "bg-good",
  ok: "bg-ok",
  warn: "bg-warn",
  low: "bg-low",
};
