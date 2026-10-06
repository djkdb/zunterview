/**
 * Prompt evaluation: runs the fixed cases in scripts/eval/cases.ts through the real prompt
 * builders and the model, checks every output automatically and prints a report.
 *
 *   npm run eval:prompts                       # needs ANTHROPIC_API_KEY (real model)
 *   npm run eval:prompts -- --runs 3           # each case 3 times (outputs vary)
 *   npm run eval:prompts -- --save             # also write docs/eval/<date>-<prompt version>.md
 *   npm run eval:prompts -- --only f-          # cases whose id starts with f-
 *
 * Without a key, start the stand-in API (npm run mock:anthropic) and set
 * ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://localhost:9911 to check the pipeline itself.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

try {
  process.loadEnvFile();
} catch {
  /* no .env */
}

const { setDataLoader } = await import("../shared/dataLoader");
setDataLoader(async (path) => JSON.parse(await readFile(join(process.cwd(), "public/data", path), "utf8")));

const { AnswerAnalysisSchema, FollowUpDecisionSchema, GeneratedQuestionSchema } = await import("../shared/schemas");
const { MODEL, callStructured, costCents, isAIConfigured } = await import("../server/claude");
const { questionPrompt } = await import("../server/prompts/questionPrompt");
const { followUpPrompt } = await import("../server/prompts/followupPrompt");
const { analysisPrompt } = await import("../server/prompts/analysisPrompt");
const { PROMPT_VERSION } = await import("../server/prompts/version");
const { CASES } = await import("./eval/cases");
type Check = import("./eval/cases").Check;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const RUNS = Math.max(1, Number(value("runs") ?? 1));
const ONLY = value("only");

if (!isAIConfigured()) {
  console.error("ANTHROPIC_API_KEY가 없습니다. 실제 모델로 측정하려면 .env에 키를 넣으세요. 파이프라인만 확인하려면 npm run mock:anthropic을 띄우고 ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://localhost:9911 로 실행하세요.");
  process.exit(1);
}

interface Row {
  id: string;
  title: string;
  run: number;
  ok: boolean;
  failed: string[];
  output: string;
  ms: number;
  cents: number | null;
}

const rows: Row[] = [];
const cases = CASES.filter((c) => !ONLY || c.id.startsWith(ONLY));
const base = process.env.ANTHROPIC_BASE_URL ? ` via ${process.env.ANTHROPIC_BASE_URL}` : "";
console.log(`prompt ${PROMPT_VERSION} · model ${MODEL}${base} · ${cases.length} cases × ${RUNS} runs\n`);

for (const c of cases) {
  for (let run = 1; run <= RUNS; run++) {
    const started = Date.now();
    let checks: Check[];
    let output: string;
    let cents: number | null = null;
    try {
      if (c.kind === "question") {
        const r = await callStructured(GeneratedQuestionSchema, await questionPrompt(c.context));
        checks = c.checks(r.data);
        output = r.data.question;
        cents = process.env.ANTHROPIC_BASE_URL ? null : costCents(r.usage);
      } else if (c.kind === "followup") {
        const r = await callStructured(FollowUpDecisionSchema, await followUpPrompt(c.context, c.turn, c.depth));
        checks = c.checks(r.data);
        output = r.data.needed ? `(꼬리질문) ${r.data.question}` : "(꼬리질문 안 함)";
        cents = process.env.ANTHROPIC_BASE_URL ? null : costCents(r.usage);
      } else {
        const r = await callStructured(AnswerAnalysisSchema, await analysisPrompt(c.context, c.turn));
        checks = c.checks(r.data);
        output = `relevance ${r.data.scores.relevance.score} · ${r.data.reaction}`;
        cents = process.env.ANTHROPIC_BASE_URL ? null : costCents(r.usage);
      }
    } catch (err) {
      checks = [["호출 성공", err instanceof Error ? err.message : String(err)]];
      output = "(실패)";
    }
    const failed = checks.filter(([, p]) => p).map(([name, p]) => `${name}: ${p}`);
    rows.push({ id: c.id, title: c.title, run, ok: !failed.length, failed, output, ms: Date.now() - started, cents });
    console.log(`${failed.length ? "✗" : "✓"} ${c.id}#${run} ${Date.now() - started}ms  ${output.slice(0, 80)}`);
    for (const f of failed) console.log(`    - ${f}`);
  }
}

const passed = rows.filter((r) => r.ok).length;
const cost = rows.reduce((s, r) => s + (r.cents ?? 0), 0);
console.log(`\n${passed}/${rows.length} passed · ≈${cost.toFixed(1)}¢`);

if (flag("save")) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = join(process.cwd(), "docs", "eval");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${date}-${PROMPT_VERSION}${process.env.ANTHROPIC_BASE_URL ? "-mock" : ""}.md`);
  const md = [
    `# 프롬프트 평가 ${date} (${PROMPT_VERSION})`,
    "",
    `모델 ${MODEL}${base}, 케이스 ${cases.length}개 × ${RUNS}회. 통과 ${passed}/${rows.length}, 비용 약 ${cost.toFixed(1)}센트.`,
    "",
    "| 케이스 | 회차 | 결과 | 출력 | 실패한 검사 |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.title} | ${r.run} | ${r.ok ? "통과" : "실패"} | ${r.output.replace(/\|/g, "/").slice(0, 120)} | ${r.failed.join("<br>").replace(/\|/g, "/") || ""} |`),
    "",
  ].join("\n");
  await writeFile(file, md);
  console.log(`saved ${file}`);
}
