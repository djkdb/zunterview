/** Self-contained HTML interview report, generated entirely in the browser. */
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, EXPERIENCE_LABEL, INTERVIEW_TYPE_LABEL, QUESTION_TYPE_LABEL } from "../../shared/labels";
import { DISCLAIMER } from "../config/options";
import type { Interview } from "../types/interview";
import { durationLabel, longDate, pad2 } from "./format";
import { strongestAndWeakest } from "./scoring";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildReportHtml(i: Interview): string {
  const scores = i.categoryScores!;
  const { strongest, weakest } = strongestAndWeakest(scores);
  const r = i.report;
  const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const bars = CATEGORY_KEYS.map(
    (k) => `<div class="bar"><span>${CATEGORY_LABEL[k]}</span><div class="track"><div style="width:${scores[k]}%"></div></div><b>${scores[k]}</b></div>`,
  ).join("");
  const questions = i.questions
    .map((q, idx) => {
      const f = q.feedback!;
      return `<section class="q">
  <h3>Q${pad2(idx + 1)} ${q.isFollowUp ? "<em>↳ follow-up</em>" : ""} <small>${QUESTION_TYPE_LABEL[q.type]} · ${q.score}/100</small></h3>
  <p class="question">${esc(q.text)}</p>
  <p class="label">Your answer</p><p class="answer">${esc(q.answer ?? "")}</p>
  <p><b>Strength</b> — ${esc(f.strength)}</p>
  <p><b>Improve</b> — ${esc(f.improve)}</p>
  <p><b>Example (illustrative)</b> — <i>${esc(f.betterAnswer.example)}</i></p>
</section>`;
    })
    .join("");

  return `<!doctype html><html lang="${i.config.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interview Report — ${esc(i.config.position)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#16161d;line-height:1.55}
h1{font-size:14px;letter-spacing:.2em;color:#6a5fd8;margin:0}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b6b78;margin:32px 0 10px;border-bottom:1px solid #e5e5ea;padding-bottom:6px}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;font-size:13px;margin-top:18px}.meta span{color:#6b6b78;display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.overall{font-size:64px;font-weight:300;margin:10px 0 0}.overall small{font-size:18px;color:#6b6b78}
.bar{display:grid;grid-template-columns:130px 1fr 36px;align-items:center;gap:10px;font-size:13px;margin:6px 0}.track{height:6px;background:#eee;border-radius:3px}.track div{height:100%;background:#8b7cf6;border-radius:3px}
.q{border:1px solid #e5e5ea;border-radius:12px;padding:14px 18px;margin:12px 0}.q h3{margin:0;font-size:13px}.q small{color:#6b6b78;font-weight:400}.q em{color:#6a5fd8;font-style:normal}
.question{font-weight:600}.answer{background:#f6f6f9;border-radius:8px;padding:8px 12px;white-space:pre-wrap;font-size:14px}.label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b6b78;margin-bottom:4px}
.note{font-size:12px;color:#6b6b78;margin-top:40px}
</style></head><body>
<h1>INTERVIEW//AI — MOCK INTERVIEW REPORT</h1>
<div class="meta">
<div><span>Position</span>${esc(i.config.position)}</div>
<div><span>Interview type</span>${INTERVIEW_TYPE_LABEL[i.config.interviewType]} · ${DIFFICULTY_LABEL[i.config.difficulty]}</div>
<div><span>Experience</span>${EXPERIENCE_LABEL[i.config.experience]}</div>
<div><span>Date</span>${longDate(i.createdAt)}</div>
<div><span>Duration</span>${durationLabel(i.duration)}</div>
<div><span>Questions answered</span>${i.questions.length}${i.endedEarly ? " (ended early)" : ""}</div>
</div>
<h2>Overall</h2>
<p class="overall">${i.overallScore}<small> / 100</small></p>
${r ? `<p><b>${esc(r.headline)}</b></p><p>${esc(r.topFeedback)}</p>` : ""}
<h2>Category scores</h2>${bars}
<p>Strongest area: <b>${CATEGORY_LABEL[strongest]}</b> · Needs improvement: <b>${CATEGORY_LABEL[weakest]}</b></p>
${r ? `<h2>Strengths</h2>${list(r.strengths)}<h2>Improvements</h2>${list(r.improvements)}<h2>Next steps</h2>${list(r.nextSteps)}` : ""}
<h2>Question summary</h2>${questions}
<p class="note">${DISCLAIMER} Example answers are illustrative and are not statements about your experience.</p>
</body></html>`;
}

export function downloadReport(i: Interview) {
  const blob = new Blob([buildReportHtml(i)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date(i.createdAt).toISOString().slice(0, 10);
  a.href = url;
  a.download = `interview-report-${i.config.position.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-${date}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
