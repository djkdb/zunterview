/**
 * Share card: position, score, top strength only — never the candidate's answers.
 */
import { CATEGORY_KO, grade } from "../config/labelsKo";
import { shortDate } from "./format";
import { strongestAndWeakest } from "./scoring";
export function shareText(i) {
    const { strongest } = strongestAndWeakest(i.categoryScores);
    return `INTERVIEW//AI 모의면접\n${i.config.position} — ${i.overallScore}점 (${grade(i.overallScore ?? 0)}등급)\n강점: ${CATEGORY_KO[strongest]}\n(연습용 피드백)`;
}
export async function renderShareCard(i) {
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    if (!g)
        return null;
    const { strongest } = strongestAndWeakest(i.categoryScores);
    try {
        await document.fonts?.ready;
    }
    catch {
        /* fonts optional */
    }
    const sans = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
    const mono = '"JetBrains Mono", ui-monospace, monospace';
    // paper
    g.fillStyle = "#eef0f3";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffffff";
    g.fillRect(70, 70, W - 140, H - 140);
    g.strokeStyle = "#cfd5dd";
    g.lineWidth = 2;
    g.strokeRect(70, 70, W - 140, H - 140);
    g.fillStyle = "#0f1b2e";
    g.fillRect(70, 70, W - 140, 120);
    g.textAlign = "center";
    g.fillStyle = "#ffffff";
    g.font = `800 50px ${sans}`;
    g.fillText("모의면접 평가표", W / 2, 150);
    g.fillStyle = "#4b5563";
    g.font = `500 40px ${sans}`;
    g.fillText(i.config.position, W / 2, 290);
    const cx = W / 2;
    const cy = 590;
    const r = 210;
    g.lineWidth = 26;
    g.strokeStyle = "#e3e7ed";
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#1b3a6b";
    g.lineCap = "round";
    g.beginPath();
    g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (i.overallScore ?? 0)) / 100);
    g.stroke();
    g.fillStyle = "#0f1b2e";
    g.font = `600 170px ${mono}`;
    g.fillText(String(i.overallScore), cx, cy + 55);
    g.fillStyle = "#7b8494";
    g.font = `500 34px ${sans}`;
    g.fillText(`/ 100점 · ${grade(i.overallScore ?? 0)}등급`, cx, cy + 115);
    g.fillStyle = "#7b8494";
    g.font = `600 30px ${sans}`;
    g.fillText("가장 우수한 항목", W / 2, 960);
    g.fillStyle = "#16704a";
    g.font = `800 60px ${sans}`;
    g.fillText(CATEGORY_KO[strongest], W / 2, 1040);
    // practice-only seal
    g.save();
    g.translate(W - 200, 330);
    g.rotate(-0.21);
    g.strokeStyle = "#b3261e";
    g.fillStyle = "#b3261e";
    g.lineWidth = 6;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(0, 0, 78, 0, Math.PI * 2);
    g.stroke();
    g.font = `800 34px ${sans}`;
    g.fillText("모의면접", 0, 6);
    g.font = `700 22px ${sans}`;
    g.fillText("연습용", 0, 40);
    g.restore();
    g.fillStyle = "#7b8494";
    g.font = `400 26px ${sans}`;
    g.fillText(`${shortDate(i.createdAt)} · ${i.questions.length}문항 · INTERVIEW//AI`, W / 2, 1200);
    return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
/** Web Share with image when possible, else download the PNG. Returns what happened. */
export async function shareResult(i) {
    const blob = await renderShareCard(i);
    const text = shareText(i);
    if (blob) {
        const file = new File([blob], "interview-result.png", { type: "image/png" });
        const nav = navigator;
        if (nav.share && nav.canShare?.({ files: [file] })) {
            try {
                await nav.share({ files: [file], text, title: "INTERVIEW//AI result" });
                return "shared";
            }
            catch {
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
    }
    catch {
        return "failed";
    }
}
