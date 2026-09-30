/** Self-contained HTML interview report, generated entirely in the browser. */
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_KO, DIFFICULTY_KO, EXPERIENCE_KO, INTERVIEW_TYPE_KO, QUESTION_TYPE_KO, grade } from "../config/labelsKo";
import { DISCLAIMER } from "../config/options";
import { applicantNumber, buildPanel } from "../config/panel";
import { getCompany } from "../../shared/companies";
import type { Interview } from "../types/interview";
import { durationLabel, longDate, pad2 } from "./format";
import { strongestAndWeakest } from "./scoring";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildReportHtml(i: Interview): string {
  const scores = i.categoryScores!;
  const { strongest, weakest } = strongestAndWeakest(scores);
  const r = i.report;
  const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const panel = buildPanel(i.config);
  const bars = CATEGORY_KEYS.map(
    (k) => `<div class="bar"><span>${CATEGORY_KO[k]}</span><div class="track"><div style="width:${scores[k]}%"></div></div><b>${scores[k]} · ${grade(scores[k])}</b></div>`,
  ).join("");
  const questions = i.questions
    .map((q, idx) => {
      const f = q.feedback!;
      return `<section class="q">
  <h3>Q${pad2(idx + 1)} ${q.isFollowUp ? "<em>↳ 꼬리질문</em>" : ""} <small>${QUESTION_TYPE_KO[q.type]} · ${q.score}점 (${grade(q.score ?? 0)})</small></h3>
  <p class="question">${esc(q.text)}</p>
  <p class="label">내 답변</p><p class="answer">${esc(q.answer ?? "")}</p>
  <p><b>잘한 점</b> — ${esc(f.strength)}</p>
  <p><b>보완할 점</b> — ${esc(f.improve)}</p>${f.roleSignal ? `
  <p><b>직무 관점 · ${esc(f.roleSignal.label)}</b> — ${esc(f.roleSignal.note)}</p>` : ""}
  <p><b>예시 (참고용)</b> — <i>${esc(f.betterAnswer.example)}</i></p>
</section>`;
    })
    .join("");

  return `<!doctype html><html lang="${i.config.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>모의면접 평가표 — ${esc(i.config.position)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#16161d;line-height:1.55}
h1{font-size:26px;letter-spacing:.3em;color:#0f1b2e;margin:0}.brand{font-size:11px;letter-spacing:.2em;color:#7b8494}.stamp{float:right;width:84px;height:84px;border:3px solid #b3261e;border-radius:50%;color:#b3261e;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-12deg);font-weight:800}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b6b78;margin:32px 0 10px;border-bottom:1px solid #e5e5ea;padding-bottom:6px}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;font-size:13px;margin-top:18px}.meta span{color:#6b6b78;display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.overall{font-size:64px;font-weight:300;margin:10px 0 0}.overall small{font-size:18px;color:#6b6b78}
.bar{display:grid;grid-template-columns:130px 1fr 36px;align-items:center;gap:10px;font-size:13px;margin:6px 0}.track{height:6px;background:#eee;border-radius:3px}.track div{height:100%;background:#1b3a6b;border-radius:3px}
.q{border:1px solid #e5e5ea;border-radius:12px;padding:14px 18px;margin:12px 0}.q h3{margin:0;font-size:13px}.q small{color:#6b6b78;font-weight:400}.q em{color:#1b3a6b;font-style:normal}
.question{font-weight:600}.answer{background:#f6f6f9;border-radius:8px;padding:8px 12px;white-space:pre-wrap;font-size:14px}.label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b6b78;margin-bottom:4px}
.note{font-size:12px;color:#6b6b78;margin-top:40px}
</style></head><body>
<div class="stamp"><small>INTERVIEW//AI</small>모의면접<small>연습용</small></div>
<p class="brand">INTERVIEW//AI 모의면접센터</p>
<h1>모의면접 평가표</h1>
<div class="meta">
<div><span>지원번호</span>${applicantNumber(i.id)}</div>
<div><span>지원 직무</span>${esc(getCompany(i.config.companyId) ? `${getCompany(i.config.companyId)!.name} · ${i.config.position}` : i.config.position)}</div>
<div><span>면접 유형</span>${INTERVIEW_TYPE_KO[i.config.interviewType]} · ${DIFFICULTY_KO[i.config.difficulty]}</div>
<div><span>경력 구분</span>${EXPERIENCE_KO[i.config.experience]}</div>
<div><span>면접 일시</span>${longDate(i.createdAt)}</div>
<div><span>소요 시간</span>${durationLabel(i.duration)}</div>
<div><span>답변 문항</span>${i.questions.length}문항${i.endedEarly ? " (조기 종료)" : ""}</div>
<div><span>면접 위원</span>${panel.center.name}(위원장) · ${panel.left.name} · ${panel.right.name}</div>
</div>
<h2>1. 종합 평가</h2>
<p class="overall">${i.overallScore}<small> / 100점 · ${grade(i.overallScore ?? 0)}등급</small></p>
${r ? `<p><b>${esc(r.headline)}</b></p>` : ""}
<p>가장 우수한 항목: <b>${CATEGORY_KO[strongest]}</b> · 보완이 필요한 항목: <b>${CATEGORY_KO[weakest]}</b></p>
<h2>2. 항목별 평가</h2>${bars}
${r ? `<h2>3. 면접위원 종합 의견</h2><p><b>“${esc(r.topFeedback)}”</b></p><h3>강점</h3>${list(r.strengths)}<h3>보완점</h3>${list(r.improvements)}<h3>다음 연습 과제</h3>${list(r.nextSteps)}` : ""}
<h2>4. 문항별 평가</h2>${questions}
<p class="note">${DISCLAIMER} 예시 답변은 참고용이며 본인의 경험에 대한 사실이 아닙니다.</p>
</body></html>`;
}

export function downloadReport(i: Interview) {
  const blob = new Blob([buildReportHtml(i)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date(i.createdAt).toISOString().slice(0, 10);
  a.href = url;
  a.download = `mock-interview-report-${date}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
