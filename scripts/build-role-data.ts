#!/usr/bin/env tsx
/**
 * Role (직무) data pipeline:
 *
 *   research/role-raw/taxonomy.json + b*.json + common.json
 *     → research/role-curation.json (manual review)
 *     → validation (schema, style, sources, role relevance)
 *     → dedupe (lexical + semantic, within what one role can ever see)
 *     → shared/data/roles.ts            taxonomy index (small, bundled)
 *       public/data/roles/profiles.json  role profiles        (loaded on demand)
 *       public/data/roles/common.json    common question bank (loaded on demand)
 *       public/data/roles/<domain>.json  one file per domain  (loaded on demand)
 *
 *   npx tsx scripts/build-role-data.ts           build
 *   npx tsx scripts/build-role-data.ts --check   verify generated files are up to date
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARCHETYPES, DIFFICULTIES, EXPERIENCE_LEVELS, QUESTION_TYPES, type Archetype, type QuestionType } from "../shared/schemas";
import {
  CONFIDENCE,
  QUESTION_BASES,
  QUESTION_CATEGORIES,
  SOURCE_TYPES,
  type PackedQuestion,
  type PackedQuestionFile,
  type QuestionBasis,
  type QuestionSource,
  type RoleProfileDetail,
  type RoleTaxonomy,
  type SourceType,
} from "../shared/roleTypes";
import { fingerprint, sameQuestion, type QuestionFingerprint } from "../shared/similarity";
import { buildLexicon, roleRelevance, relevanceBand } from "../shared/relevance";

const RAW = "research/role-raw";
const CURATION = "research/role-curation.json";
const OUT_INDEX = "shared/data/roles.ts";
const OUT_DIR = "public/data/roles";
const CHECK = process.argv.includes("--check");

/* ─────────────────────────────── inputs ─────────────────────────────── */

interface Taxonomy {
  groups: { id: string; name: string }[];
  domains: { id: string; name: string; nameEn: string; group: string }[];
  families: { id: string; domain: string; name: string; nameEn: string; dept: string; archetype: Archetype }[];
  roles: { id: string; family: string; ko: string; en: string }[];
}
interface RawSource { id: string; title?: string; url?: string; type?: string; year?: number }
interface RawProfile {
  id: string;
  aliases?: string[];
  skills?: string[];
  responsibilities?: string[];
  keywords?: string[];
  topics?: Partial<Record<"role" | "scenario" | "result" | "en", string[]>>;
}
interface RawQuestion {
  text?: string;
  en?: string;
  scope?: string;
  category?: string;
  type?: string;
  difficulty?: string;
  levels?: string[];
  basis?: string;
  src?: string;
  confidence?: string;
}
interface RawFile { batch?: string; sources?: RawSource[]; profiles?: RawProfile[]; questions?: RawQuestion[] }
interface Curation {
  aliases?: Record<string, string[]>;
  removeAliases?: string[];
  dropQuestions?: { text: string; why?: string }[];
  reclassify?: { text: string; type?: string; category?: string; basis?: string; scope?: string }[];
  dropSourcesEverywhere?: string[];
  /** Sources that aren't first-hand candidate reports (mentor advice, compiled lists): their questions become practice questions. */
  demoteReviewSources?: { urlIncludes: string; why?: string }[];
}

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const uniq = (xs: string[]) => [...new Map(xs.map((x) => [x.toLowerCase().replace(/\s+/g, ""), x])).values()];

const tax = readJson<Taxonomy>(join(RAW, "taxonomy.json"));
const curation: Curation = existsSync(CURATION) ? readJson<Curation>(CURATION) : {};
const errors: string[] = [];
const notes: string[] = [];

/* ───────────────────────── taxonomy integrity ───────────────────────── */

const domainIds = new Set(tax.domains.map((d) => d.id));
const familyById = new Map(tax.families.map((f) => [f.id, f]));
const roleById = new Map(tax.roles.map((r) => [r.id, r]));
for (const f of tax.families) {
  if (!domainIds.has(f.domain)) errors.push(`family ${f.id}: unknown domain ${f.domain}`);
  if (!(ARCHETYPES as readonly string[]).includes(f.archetype)) errors.push(`family ${f.id}: unknown archetype ${f.archetype}`);
}
for (const r of tax.roles) if (!familyById.has(r.family)) errors.push(`role ${r.id}: unknown family ${r.family}`);
if (roleById.size !== tax.roles.length) errors.push("duplicate role ids");
const domainOfRole = (id: string) => familyById.get(roleById.get(id)!.family)!.domain;

/* ─────────────────────────────── raw files ──────────────────────────── */

const rawFiles = readdirSync(RAW)
  .filter((f) => /^(?:b\d+.*|common)\.json$/.test(f))
  .sort();

const PAID = [/happycampus/i, /reportworld/i, /happyhaksul/i, /welldone/i, /allreport/i, ...(curation.dropSourcesEverywhere ?? []).map((d) => new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))];

interface Candidate {
  text: string;
  en?: string;
  scope: string;
  category: string;
  type: QuestionType;
  difficulty: string;
  levels?: string[];
  basis: QuestionBasis;
  source?: QuestionSource;
  confidence: string;
  file: string;
}

const profiles = new Map<string, RawProfile>();
const demotedIds = new Set<string>();
const candidates: Candidate[] = [];
const dropped: Record<string, number> = {};
const drop = (why: string) => (dropped[why] = (dropped[why] ?? 0) + 1);
const dropList = new Set((curation.dropQuestions ?? []).map((d) => clean(d.text)));

const BASIS_SOURCE: Record<QuestionBasis, SourceType[]> = {
  공개후기: ["interview_review", "other_public"],
  공식자료: ["official_recruitment", "job_description", "ncs", "other_public"],
  공고기반: ["job_description", "official_recruitment"],
  직무기반: [],
  일반면접: [],
};

const DISCRIMINATORY = /결혼|출산|임신|외모|키가|몸무게|체중|종교|부모님\s?직업|(?<!장)애인|연애|혈액형|정치\s?성향|고향|출신\s?지역/;
const EXAM_STYLE = /(?:하십시오|하시오|논하라|서술하라|기술하라)[.?]?$/;
const COMPANY_NAMES = /삼성|현대자동차|현대차|LG|SK하이닉스|네이버|카카오|쿠팡|토스|배달의민족|한국전력|한전|국민은행|신한은행|하나은행|농협/;

for (const file of rawFiles) {
  let data: RawFile;
  try {
    data = readJson<RawFile>(join(RAW, file));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${(e as Error).message})`);
    continue;
  }
  const sources = new Map<string, QuestionSource>();
  for (const s of data.sources ?? []) {
    const url = clean(s.url);
    const type = clean(s.type) as SourceType;
    if (!/^https?:\/\//.test(url) || PAID.some((re) => re.test(url))) {
      notes.push(`${file}: dropped source ${s.id} (${url || "no url"})`);
      continue;
    }
    const demoted = (curation.demoteReviewSources ?? []).some((d) => url.includes(d.urlIncludes));
    if (demoted) demotedIds.add(`${file}:${clean(s.id)}`);
    sources.set(clean(s.id), {
      title: clean(s.title).slice(0, 200) || url,
      url,
      type: demoted ? "other_public" : (SOURCE_TYPES as readonly string[]).includes(type) ? type : "other_public",
      ...(Number.isInteger(s.year) ? { year: s.year } : {}),
    });
  }
  for (const p of data.profiles ?? []) {
    if (!roleById.has(p.id)) {
      notes.push(`${file}: profile for unknown role ${p.id}`);
      continue;
    }
    const prev = profiles.get(p.id);
    profiles.set(p.id, prev ? { ...prev, ...p } : p);
  }
  for (const q of data.questions ?? []) {
    let text = clean(q.text).replace(/^\d+[.)]\s*/, "");
    if (/[까요죠나]$/.test(text)) text += "?";
    const common = file === "common.json";
    let scope = clean(q.scope) || (common ? "common" : "");
    const re = (curation.reclassify ?? []).find((r) => clean(r.text) === text);
    if (re?.scope) scope = re.scope;
    const type = clean(re?.type ?? q.type) as QuestionType;
    const category = clean(re?.category ?? q.category);
    const difficulty = clean(q.difficulty) || "normal";
    let basis = clean(re?.basis ?? q.basis) as QuestionBasis;
    const confidence = clean(q.confidence) || "medium";
    const levels = (q.levels ?? []).map(clean).filter((x) => (EXPERIENCE_LEVELS as readonly string[]).includes(x));

    if (dropList.has(text)) {
      drop("curation");
      continue;
    }
    const [kind, target] = scope.split(":");
    const scopeOk =
      scope === "common" ||
      (kind === "role" && roleById.has(target)) ||
      (kind === "family" && familyById.has(target)) ||
      (kind === "domain" && domainIds.has(target));
    if (!scopeOk) {
      drop("unknown scope");
      continue;
    }
    if (text.length < 8 || text.length > 120) {
      drop("length");
      continue;
    }
    if (!/[가-힣]/.test(text) || !/[?.]$/.test(text)) {
      drop("not a Korean question sentence");
      continue;
    }
    if (/기출/.test(text) || EXAM_STYLE.test(text)) {
      drop("style");
      continue;
    }
    if (DISCRIMINATORY.test(text)) {
      drop("discriminatory topic");
      continue;
    }
    const placeholders = text.match(/\{[^}]*\}/g) ?? [];
    if (placeholders.some((p) => !/^\{role(?::(?:을\/를|이\/가|은\/는|와\/과))?\}$/.test(p)) || (placeholders.length && scope !== "common")) {
      drop("placeholder");
      continue;
    }
    if (scope !== "common" && COMPANY_NAMES.test(text)) {
      drop("company name in role question");
      continue;
    }
    if (
      !(QUESTION_TYPES as readonly string[]).includes(type) ||
      (type === "company_understanding" && scope !== "common") ||
      !(QUESTION_CATEGORIES as readonly string[]).includes(category) ||
      !(DIFFICULTIES as readonly string[]).includes(difficulty) ||
      !(CONFIDENCE as readonly string[]).includes(confidence)
    ) {
      drop("invalid enum");
      continue;
    }
    if (!(QUESTION_BASES as readonly string[]).includes(basis)) basis = common ? "일반면접" : "직무기반";
    let source = q.src ? sources.get(clean(q.src)) : undefined;
    if (basis === "공개후기" && q.src && demotedIds.has(`${file}:${clean(q.src)}`)) {
      basis = common ? "일반면접" : "직무기반";
      drop("demoted review (kept)");
    }
    const needs = BASIS_SOURCE[basis];
    if (needs.length && (!source || !needs.includes(source.type))) {
      // A "reported"/"official" claim without a matching source is downgraded, never kept as is.
      notes.push(`${file}: downgraded to practice question (no matching source): ${text}`);
      drop("downgraded basis (kept)");
      basis = common ? "일반면접" : "직무기반";
    }
    if (!needs.length && basis !== "직무기반" && basis !== "일반면접") source = undefined;
    candidates.push({
      text,
      ...(q.en && clean(q.en) ? { en: clean(q.en).slice(0, 240) } : {}),
      scope,
      category,
      type,
      difficulty,
      ...(levels.length && levels.length < 4 ? { levels } : {}),
      basis,
      ...(source && BASIS_SOURCE[basis].length ? { source } : {}),
      confidence,
      file,
    });
  }
}
// Downgraded questions are kept — don't count them as dropped in the totals.
const downgraded = (dropped["downgraded basis (kept)"] ?? 0) + (dropped["demoted review (kept)"] ?? 0);
delete dropped["downgraded basis (kept)"];
delete dropped["demoted review (kept)"];

/* ────────────────────────────── profiles ────────────────────────────── */

const GENERIC_ALIAS = new Set(["기획", "관리", "개발", "연구", "운영", "사무", "담당", "담당자", "엔지니어", "연구원", "디자이너", "전문가", "매니저", "지원", "행정", "기술", "설계", "영업", "마케팅", "마케터", "서비스", "교육", "상담", "분석", "품질", "생산", "공정", "안전", "환경", "보건", "의료", "금융", "재무", "회계사"]);

function autoAliases(ko: string, en: string): string[] {
  const out = [ko, en];
  const base = ko.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const inner = ko.match(/\((.*?)\)/)?.[1];
  out.push(base);
  if (inner) out.push(...inner.split(/[·,]/).map((s) => s.trim()));
  for (const part of base.split("·")) out.push(part.trim());
  out.push(base.replace(/\s?(?:개발자|엔지니어|담당)$/, ""));
  return out.filter((a) => a && a.length >= 2);
}

const aliasOwners = new Map<string, Set<string>>();
const roleAliases = new Map<string, string[]>();
const removeAliases = new Set((curation.removeAliases ?? []).map((a) => a.toLowerCase().replace(/\s+/g, "")));
for (const r of tax.roles) {
  const p = profiles.get(r.id);
  const all = uniq([...autoAliases(r.ko, r.en), ...(p?.aliases ?? []), ...(curation.aliases?.[r.id] ?? [])].map(clean)).filter((a) => a.length >= 2 && a.length <= 40);
  roleAliases.set(r.id, all);
  for (const a of all) {
    const k = a.toLowerCase().replace(/\s+/g, "");
    if (!aliasOwners.has(k)) aliasOwners.set(k, new Set());
    aliasOwners.get(k)!.add(r.id);
  }
}
// An alias shared by several roles, or too generic, is useless for resolving — search handles it instead.
for (const [id, list] of roleAliases) {
  roleAliases.set(
    id,
    list.filter((a) => {
      const k = a.toLowerCase().replace(/\s+/g, "");
      const r = roleById.get(id)!;
      const own = a === r.ko || a === r.en;
      return own || (aliasOwners.get(k)!.size === 1 && !GENERIC_ALIAS.has(k) && !removeAliases.has(k));
    }),
  );
}

const profileOut: Record<string, RoleProfileDetail> = {};
const list = (xs: unknown, max: number, len = 60) => uniq(((Array.isArray(xs) ? xs : []) as unknown[]).map(clean).filter(Boolean).map((x) => x.slice(0, len))).slice(0, max);
for (const r of tax.roles) {
  const p = profiles.get(r.id);
  if (!p) {
    errors.push(`role ${r.id}: no profile`);
    continue;
  }
  profileOut[r.id] = {
    skills: list(p.skills, 10, 40),
    responsibilities: list(p.responsibilities, 8, 80),
    keywords: list(p.keywords, 24, 30),
    topics: { role: list(p.topics?.role, 10, 40), scenario: list(p.topics?.scenario, 8, 60), result: list(p.topics?.result, 6, 40), en: list(p.topics?.en, 8, 60) },
  };
  if (profileOut[r.id].skills.length < 3 || profileOut[r.id].keywords.length < 5) errors.push(`role ${r.id}: thin profile`);
}

/* ─────────────────────── relevance + dedupe ─────────────────────────── */

function lexiconFor(scope: string): { lexicon: string[]; archetype: Archetype } {
  const [kind, id] = scope.split(":");
  const roles =
    kind === "role" ? [id] : kind === "family" ? tax.roles.filter((r) => r.family === id).map((r) => r.id) : tax.roles.filter((r) => domainOfRole(r.id) === id).map((r) => r.id);
  const fam = kind === "role" ? familyById.get(roleById.get(id)!.family)! : kind === "family" ? familyById.get(id)! : tax.families.find((f) => f.domain === id)!;
  const dom = tax.domains.find((d) => d.id === fam.domain)!;
  const parts = [fam.name, dom.name];
  for (const rid of roles) {
    const p = profileOut[rid];
    const r = roleById.get(rid)!;
    parts.push(r.ko, ...(roleAliases.get(rid) ?? []));
    if (p) parts.push(...p.skills, ...p.keywords, ...p.topics.role, ...p.topics.scenario, ...p.topics.result, ...p.responsibilities);
  }
  return { lexicon: buildLexicon(parts), archetype: fam.archetype };
}
const lexCache = new Map<string, ReturnType<typeof lexiconFor>>();

const bands: Record<string, number> = { strong: 0, usable: 0, general: 0 };
const relevant = candidates.filter((c) => {
  if (c.scope === "common") return true;
  if (!lexCache.has(c.scope)) lexCache.set(c.scope, lexiconFor(c.scope));
  const { lexicon, archetype } = lexCache.get(c.scope)!;
  const rel = roleRelevance(c.text, c.type, lexicon, archetype);
  const band = relevanceBand(rel.score);
  if (band === "reject") {
    drop("low role relevance");
    notes.push(`relevance ${rel.score} (${rel.foreign.join(",")}) ${c.scope}: ${c.text}`);
    return false;
  }
  bands[band]++;
  return true;
});

// Order: common first, then broader scopes, so the specific rewording is the one dropped.
const RANK: Record<string, number> = { common: 0, domain: 1, family: 2, role: 3 };
relevant.sort((a, b) => RANK[a.scope.split(":")[0]] - RANK[b.scope.split(":")[0]]);

/** Visibility keys: a question competes only with questions the same role could also be asked. */
function visibility(scope: string): { own: string; sees: string[] } {
  const [kind, id] = scope.split(":");
  if (kind === "common" || scope === "common") return { own: "common", sees: ["common", "*"] };
  if (kind === "domain") return { own: scope, sees: ["common", scope, `in:${id}`] };
  if (kind === "family") {
    const d = familyById.get(id)!.domain;
    return { own: scope, sees: ["common", `domain:${d}`, scope, `infam:${id}`] };
  }
  const f = roleById.get(id)!.family;
  const d = familyById.get(f)!.domain;
  return { own: scope, sees: ["common", `domain:${d}`, `family:${f}`, scope] };
}

const kept: (Candidate & { fp: QuestionFingerprint })[] = [];
const byKey = new Map<string, (Candidate & { fp: QuestionFingerprint })[]>();
const addKey = (k: string, q: Candidate & { fp: QuestionFingerprint }) => {
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k)!.push(q);
};
let duplicates = 0;
for (const c of relevant) {
  const fp = fingerprint(c.text);
  const v = visibility(c.scope);
  const pools: (Candidate & { fp: QuestionFingerprint })[][] = [];
  if (v.own === "common") pools.push(byKey.get("common") ?? []);
  else for (const k of v.sees) pools.push(byKey.get(k) ?? []);
  if (pools.some((pool) => pool.some((x) => sameQuestion(fp, x.fp)))) {
    duplicates++;
    continue;
  }
  const q = { ...c, fp };
  kept.push(q);
  addKey(v.own, q);
  // Let broader scopes see what narrower ones already hold (checked when a domain question arrives later).
  const [kind, id] = c.scope.split(":");
  if (kind === "family") addKey(`in:${familyById.get(id)!.domain}`, q);
  if (kind === "role") {
    const f = roleById.get(id)!.family;
    addKey(`infam:${f}`, q);
    addKey(`in:${familyById.get(f)!.domain}`, q);
  }
}

/* ─────────────────────────────── outputs ────────────────────────────── */

function pack(qs: Candidate[]): PackedQuestionFile {
  const sources: QuestionSource[] = [];
  const idx = new Map<string, number>();
  const questions: PackedQuestion[] = qs.map((q) => {
    let r: number | undefined;
    if (q.source) {
      if (!idx.has(q.source.url)) {
        idx.set(q.source.url, sources.length);
        sources.push(q.source);
      }
      r = idx.get(q.source.url);
    }
    return {
      t: q.text,
      s: q.scope,
      c: q.category as PackedQuestion["c"],
      y: q.type,
      d: q.difficulty as PackedQuestion["d"],
      ...(q.levels ? { l: q.levels as PackedQuestion["l"] } : {}),
      b: q.basis,
      ...(r !== undefined ? { r } : {}),
      cf: q.confidence as PackedQuestion["cf"],
      ...(q.en ? { en: q.en } : {}),
    };
  });
  return { version: 1, sources, questions };
}

const outputs = new Map<string, string>();
const json = (x: unknown) => `${JSON.stringify(x)}\n`;
const domainOfScope = (scope: string) => {
  const [kind, id] = scope.split(":");
  return kind === "domain" ? id : kind === "family" ? familyById.get(id)!.domain : domainOfRole(id);
};
const common = kept.filter((q) => q.scope === "common");
outputs.set(join(OUT_DIR, "common.json"), json(pack(common)));
outputs.set(join(OUT_DIR, "profiles.json"), json(profileOut));
const perDomain = new Map<string, Candidate[]>();
for (const q of kept) {
  if (q.scope === "common") continue;
  const d = domainOfScope(q.scope);
  if (!perDomain.has(d)) perDomain.set(d, []);
  perDomain.get(d)!.push(q);
}
for (const d of tax.domains) outputs.set(join(OUT_DIR, `${d.id}.json`), json(pack(perDomain.get(d.id) ?? [])));

const countScope = (pred: (q: Candidate) => boolean) => kept.filter(pred).length;
const byBasis = Object.fromEntries(QUESTION_BASES.map((b) => [b, kept.filter((q) => q.basis === b).length])) as Record<QuestionBasis, number>;
const allSources = new Set(kept.flatMap((q) => (q.source ? [q.source.url] : [])));
const taxonomy: RoleTaxonomy = {
  groups: tax.groups,
  domains: tax.domains.map((d) => ({ ...d, q: (perDomain.get(d.id) ?? []).length })),
  families: tax.families.map((f) => ({ ...f, q: countScope((q) => q.scope === `family:${f.id}` || (q.scope.startsWith("role:") && roleById.get(q.scope.slice(5))!.family === f.id)) })),
  roles: tax.roles.map((r) => ({ id: r.id, family: r.family, ko: r.ko, en: r.en, aliases: roleAliases.get(r.id) ?? [], q: countScope((q) => q.scope === `role:${r.id}`) })),
  stats: {
    roles: tax.roles.length,
    domains: tax.domains.length,
    families: tax.families.length,
    questions: kept.length,
    commonQuestions: common.length,
    byBasis,
    sources: allSources.size,
    generatedAt: "",
  },
};

const previous = existsSync(OUT_INDEX) ? readFileSync(OUT_INDEX, "utf8") : "";
const prevDate = previous.match(/"generatedAt": "([^"]*)"/)?.[1] ?? "";
const indexBody = (date: string) => {
  taxonomy.stats.generatedAt = date;
  return (
    `// Generated by scripts/build-role-data.ts from research/role-raw — do not edit by hand.\n` +
    `import type { RoleTaxonomy } from "../roleTypes";\n\n` +
    `export const ROLE_TAXONOMY: RoleTaxonomy = ${JSON.stringify(taxonomy, null, 1)};\n`
  );
};
// Keep the date stable when nothing else changed, so --check passes and diffs stay small.
const sameAsBefore = previous && indexBody(prevDate) === previous;
outputs.set(OUT_INDEX, indexBody(sameAsBefore ? prevDate : new Date().toISOString().slice(0, 10)));

/* ─────────────────────────────── report ─────────────────────────────── */

const perDomainReport = tax.domains.map((d) => {
  const qs = perDomain.get(d.id) ?? [];
  const src = new Set(qs.flatMap((q) => (q.source ? [q.source.url] : []))).size;
  return `${d.name.padEnd(12, "　")} ${String(qs.length).padStart(4)} questions · ${String(src).padStart(2)} sources`;
});
const thinRoles = taxonomy.roles.filter((r) => r.q < 10).map((r) => `${r.id}(${r.q})`);

console.log(perDomainReport.join("\n"));
console.log(`\nRoles ${taxonomy.stats.roles} · families ${taxonomy.stats.families} · domains ${taxonomy.stats.domains}`);
console.log(`Questions ${kept.length} (common ${common.length}) · duplicates removed ${duplicates} · invalid dropped ${Object.values(dropped).reduce((a, b) => a + b, 0)} · downgraded ${downgraded}`);
console.log(`Basis ${Object.entries(byBasis).map(([k, v]) => `${k} ${v}`).join(" · ")} · sources ${allSources.size}`);
console.log(`Relevance strong ${bands.strong} · usable ${bands.usable} · general ${bands.general}`);
if (Object.keys(dropped).length) console.log(`Dropped: ${Object.entries(dropped).map(([k, v]) => `${k} ${v}`).join(", ")}`);
if (thinRoles.length) console.log(`Roles with <10 role-level questions: ${thinRoles.join(", ")}`);
if (process.argv.includes("--verbose")) console.log(notes.join("\n"));
if (errors.length) console.log(`\nERRORS\n${errors.join("\n")}`);

if (CHECK) {
  const stale = [...outputs].filter(([path, body]) => !existsSync(path) || readFileSync(path, "utf8") !== body).map(([p]) => p);
  if (stale.length) {
    console.error(`\nGenerated data is out of date — run \`npm run build:data\`:\n${stale.join("\n")}`);
    process.exit(1);
  }
  if (errors.length) process.exit(1);
  console.log("\nrole data: up to date");
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [path, body] of outputs) writeFileSync(path, body);
  console.log(`\n→ ${OUT_INDEX}, ${OUT_DIR}/*.json (${outputs.size - 1} files)`);
  if (errors.length) process.exitCode = 1;
}
