/**
 * Share card: position, score, top strength only — never the candidate's answers.
 */
import { CATEGORY_LABEL } from "../../shared/labels";
import type { Interview } from "../types/interview";
import { shortDate } from "./format";
import { strongestAndWeakest } from "./scoring";

export function shareText(i: Interview): string {
  const { strongest } = strongestAndWeakest(i.categoryScores!);
  return `INTERVIEW//AI mock interview\n${i.config.position} — ${i.overallScore}/100\nTop strength: ${CATEGORY_LABEL[strongest]}\n(practice feedback)`;
}

export async function renderShareCard(i: Interview): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  const { strongest } = strongestAndWeakest(i.categoryScores!);
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts optional */
  }

  g.fillStyle = "#07070a";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 520, 50, W / 2, 520, 620);
  glow.addColorStop(0, "rgba(139,124,246,0.28)");
  glow.addColorStop(1, "rgba(139,124,246,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const mono = '"JetBrains Mono", ui-monospace, monospace';
  const sans = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
  g.textAlign = "center";
  g.fillStyle = "#f3f3f6";
  g.font = `500 34px ${mono}`;
  g.fillText("INTERVIEW//AI", W / 2, 150);

  g.fillStyle = "#a1a1ad";
  g.font = `400 40px ${sans}`;
  g.fillText(i.config.position, W / 2, 290);

  // ring
  const cx = W / 2;
  const cy = 600;
  const r = 230;
  g.lineWidth = 22;
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, "#8b7cf6");
  grad.addColorStop(1, "#6c8cff");
  g.strokeStyle = grad;
  g.lineCap = "round";
  g.beginPath();
  g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (i.overallScore ?? 0)) / 100);
  g.stroke();

  g.fillStyle = "#f3f3f6";
  g.font = `300 180px ${mono}`;
  g.fillText(String(i.overallScore), cx, cy + 62);
  g.fillStyle = "#6b6b78";
  g.font = `400 34px ${mono}`;
  g.fillText("/ 100", cx, cy + 120);

  g.fillStyle = "#6b6b78";
  g.font = `500 28px ${mono}`;
  g.fillText("TOP STRENGTH", W / 2, 990);
  g.fillStyle = "#62d2a2";
  g.font = `600 56px ${sans}`;
  g.fillText(CATEGORY_LABEL[strongest], W / 2, 1065);

  g.fillStyle = "#6b6b78";
  g.font = `400 26px ${sans}`;
  g.fillText(`${shortDate(i.createdAt)} · ${i.questions.length} questions · practice feedback`, W / 2, 1230);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

/** Web Share with image when possible, else download the PNG. Returns what happened. */
export async function shareResult(i: Interview): Promise<"shared" | "downloaded" | "copied" | "failed"> {
  const blob = await renderShareCard(i);
  const text = shareText(i);
  if (blob) {
    const file = new File([blob], "interview-result.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text, title: "INTERVIEW//AI result" });
        return "shared";
      } catch {
        /* user cancelled — fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview-result.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
