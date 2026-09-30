#!/usr/bin/env tsx
/**
 * Validates the generated interview data (what the app actually ships):
 *
 *   npx tsx scripts/validate-data.ts               everything
 *   npx tsx scripts/validate-data.ts --roles       role taxonomy + profiles
 *   npx tsx scripts/validate-data.ts --questions   role question bank
 *   npx tsx scripts/validate-data.ts --companies   company dataset
 *   add --verbose for one line per role
 *
 * Exits non-zero on any failure. Complements scripts/build-role-data.ts --check,
 * which verifies the generated files match the raw research.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIFFICULTIES, EXPERIENCE_LEVELS, QUESTION_TYPES, type Archetype } from "../shared/schemas";
import { CONFIDENCE, QUESTION_BASES, QUESTION_CATEGORIES, SOURCE_TYPES, type PackedQuestionFile, type RoleProfileDetail } from "../shared/roleTypes";
import { ROLE_TAXONOMY } from "../shared/data/roles";
import { z } from "zod";
import { COMPANIES, COMPANY_DATA_COUNT, CompanyQuestionSchema } from "../shared/companies";

const CompanyQuestionsSchema = z.array(CompanyQuestionSchema).min(5).max(150);
import { fingerprint, sameQuestion } from "../shared/similarity";
import { buildLexicon, roleRelevance } from "../shared/relevance";

const args = new Set(process.argv.slice(2));
const all = !["--roles", "--questions", "--companies"].some((a) => args.has(a));
const VERBOSE = args.has("--verbose");
const DIR = "public/data/roles";
const MIN = { roles: 150, domains: 51, questions: 3000, perRoleVisible: 150, perRoleOwn: 12 };

const failures: string[] = [];
const fail = (m: string) => failures.push(m);
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DIR, f), "utf8")) as T;
const { domains, families, roles, stats } = ROLE_TAXONOMY;
const familyById = new Map(families.map((f) => [f.id, f]));

/* ─────────────────────────────── roles ──────────────────────────────── */

if (all || args.has("--roles")) {
  const profiles = read<Record<string, RoleProfileDetail>>("profiles.json");
  if (roles.length < MIN.roles) fail(`only ${roles.length} roles (need ≥ ${MIN.roles})`);
  if (domains.length < MIN.domains) fail(`only ${domains.length} domains (need ≥ ${MIN.domains})`);
  if (new Set(roles.map((r) => r.id)).size !== roles.length) fail("duplicate role ids");
  const aliasOwner = new Map<string, string>();
  for (const r of roles) {
    const f = familyById.get(r.family);
    if (!f) fail(`role ${r.id}: unknown family ${r.family}`);
    else if (!domains.some((d) => d.id === f.domain)) fail(`family ${f.id}: unknown domain ${f.domain}`);
    if (!r.ko || !r.en) fail(`role ${r.id}: missing title`);
    const p = profiles[r.id];
    if (!p) fail(`role ${r.id}: no profile`);
    else if (p.skills.length < 3 || p.keywords.length < 5 || p.topics.role.length < 3) fail(`role ${r.id}: thin profile`);
    for (const a of r.aliases) {
      const k = a.toLowerCase().replace(/\s+/g, "");
      if (aliasOwner.has(k) && aliasOwner.get(k) !== r.id) fail(`alias "${a}" belongs to ${aliasOwner.get(k)} and ${r.id}`);
      aliasOwner.set(k, r.id);
    }
  }
  console.log(`Roles ${roles.length} · families ${families.length} · domains ${domains.length} · aliases ${aliasOwner.size}`);
}

/* ───────────────────────────── questions ────────────────────────────── */

if (all || args.has("--questions")) {
  const profiles = read<Record<string, RoleProfileDetail>>("profiles.json");
  const common = read<PackedQuestionFile>("common.json");
  const byDomain = new Map(domains.map((d) => [d.id, read<PackedQuestionFile>(`${d.id}.json`)]));
  let total = common.questions.length;
  let invalid = 0;
  const check = (file: string, f: PackedQuestionFile) => {
    for (const q of f.questions) {
      const bad =
        !q.t ||
        q.t.length > 120 ||
        !(QUESTION_TYPES as readonly string[]).includes(q.y) ||
        !(QUESTION_CATEGORIES as readonly string[]).includes(q.c) ||
        !(DIFFICULTIES as readonly string[]).includes(q.d) ||
        !(QUESTION_BASES as readonly string[]).includes(q.b) ||
        !(CONFIDENCE as readonly string[]).includes(q.cf) ||
        (q.l ?? []).some((l) => !(EXPERIENCE_LEVELS as readonly string[]).includes(l)) ||
        /기출/.test(q.t) ||
        ((q.b === "공개후기" || q.b === "공식자료" || q.b === "공고기반") && (q.r === undefined || !f.sources[q.r])) ||
        (q.r !== undefined && !(SOURCE_TYPES as readonly string[]).includes(f.sources[q.r]?.type));
      if (bad) {
        invalid++;
        fail(`${file}: invalid question "${q.t}"`);
      }
    }
  };
  check("common.json", common);
  for (const [d, f] of byDomain) {
    total += f.questions.length;
    check(`${d}.json`, f);
  }
  if (total < MIN.questions) fail(`only ${total} questions (need ≥ ${MIN.questions})`);
  if (total !== stats.questions) fail(`index says ${stats.questions} questions, files hold ${total} — run npm run build:data`);

  const commonFps = common.questions.map((q) => fingerprint(q.t));
  let duplicates = 0;
  let rejected = 0;
  for (const r of roles) {
    const fam = familyById.get(r.family)!;
    const file = byDomain.get(fam.domain)!;
    const own = file.questions.filter((q) => q.s === `role:${r.id}`);
    const visible = file.questions.filter((q) => q.s === `role:${r.id}` || q.s === `family:${fam.id}` || q.s === `domain:${fam.domain}`);
    const types = new Set([...visible, ...common.questions].map((q) => q.y));
    if (own.length < MIN.perRoleOwn) fail(`${r.id}: only ${own.length} role-level questions`);
    if (visible.length + common.questions.length < MIN.perRoleVisible) fail(`${r.id}: only ${visible.length + common.questions.length} visible questions`);
    // Same meaning twice in what one role can be asked → a duplicate that slipped through.
    const fps = visible.map((q) => fingerprint(q.t));
    let d = 0;
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) if (sameQuestion(fps[i], fps[j])) d++;
      for (const c of commonFps) if (sameQuestion(fps[i], c)) d++;
    }
    duplicates += d;
    // Role relevance: nothing foreign to the job (React for an accountant, CI/CD for a nurse).
    const p = profiles[r.id];
    const lexicon = buildLexicon([r.ko, ...r.aliases, fam.name, ...(p ? [...p.skills, ...p.keywords, ...p.topics.role, ...p.topics.scenario, ...p.topics.result, ...p.responsibilities] : [])]);
    const bad = own.filter((q) => roleRelevance(q.t, q.y, lexicon, fam.archetype as Archetype).score < 0.5);
    rejected += bad.length;
    for (const q of bad) fail(`${r.id}: low role relevance — ${q.t}`);
    const sources = new Set(visible.flatMap((q) => (q.r !== undefined ? [file.sources[q.r].url] : [])));
    if (VERBOSE) console.log(`${r.ko.padEnd(18, "　")} own ${String(own.length).padStart(3)} · visible ${String(visible.length + common.questions.length).padStart(4)} · types ${types.size} · duplicates ${d} · sources ${sources.size} ${d || bad.length ? "FAIL" : "PASS"}`);
  }
  if (duplicates) fail(`${duplicates} near-duplicate pairs within what one role can be asked`);
  const basis = Object.fromEntries(QUESTION_BASES.map((b) => [b, 0]));
  for (const f of [common, ...byDomain.values()]) for (const q of f.questions) basis[q.b]++;
  console.log(`Questions ${total} (common ${common.questions.length}) · invalid ${invalid} · duplicates ${duplicates} · low relevance ${rejected}`);
  console.log(`Basis ${Object.entries(basis).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
}

/* ───────────────────────────── companies ────────────────────────────── */

if (all || args.has("--companies")) {
  if (COMPANIES.length !== COMPANY_DATA_COUNT) fail(`${COMPANY_DATA_COUNT - COMPANIES.length} company entries fail validation`);
  let qs = 0;
  let reported = 0;
  for (const c of COMPANIES) {
    const bank = CompanyQuestionsSchema.safeParse(JSON.parse(readFileSync(join("public/data/companies", `${c.id}.json`), "utf8")).questions);
    if (!bank.success) {
      fail(`${c.name}: invalid question bank`);
      continue;
    }
    const questions = bank.data;
    qs += questions.length;
    reported += questions.filter((q) => q.basis === "후기").length;
    if (questions.length !== c.questionCount) fail(`${c.name}: profile says ${c.questionCount} questions, bank has ${questions.length}`);
    if (!c.sources.length) fail(`${c.name}: no sources`);
    const fps = questions.map((q) => fingerprint(q.text));
    for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) if (sameQuestion(fps[i], fps[j]) && questions[i].track === questions[j].track) fail(`${c.name}: near-duplicate "${questions[i].text}" / "${questions[j].text}"`);
  }
  console.log(`Companies ${COMPANIES.length} · questions ${qs} · reported ${reported}`);
}

if (failures.length) {
  console.error(`\nFAIL (${failures.length})\n${failures.slice(0, 60).join("\n")}${failures.length > 60 ? `\n… ${failures.length - 60} more` : ""}`);
  process.exit(1);
}
console.log("PASS");
