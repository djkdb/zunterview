import { useEffect, useMemo, useState } from "react";
import { LIMITS } from "../../shared/schemas";
import type { RoleProfileDetail } from "../../shared/roleTypes";
import {
  domainOf,
  domainsInGroup,
  familiesInDomain,
  familyOf,
  getRole,
  resolveRole,
  ROLE_GROUPS,
  ROLE_STATS,
  rolesInFamily,
  searchRoles,
  type RoleMatch,
} from "../../shared/roles";
import { loadProfiles } from "../../shared/roleBank";
import { BUCKET_LABEL, type planComposition } from "../../shared/blueprints";
import { Button } from "./ui/Button";

interface Props {
  position: string;
  roleId: string | undefined;
  /** position: what the candidate is applying for; roleId: the taxonomy role, if it's one of ours. */
  onChange: (position: string, roleId: string | undefined) => void;
  composition: ReturnType<typeof planComposition>;
}

const BUCKET_COLOR: Record<"job" | "experience" | "situation" | "fit", string> = {
  job: "bg-navy",
  experience: "bg-accent-2",
  situation: "bg-[#8a94a3]",
  fit: "bg-[#c3cad3]",
};

const chip = (active: boolean) =>
  `min-h-9 rounded-lg border px-3 text-[13px] transition-colors ${active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-ink"}`;

/**
 * Job selection: search (fuzzy, Korean/English aliases) or browse
 * 분야 → 직무, then confirm. Any job can also be typed freely — it is matched to
 * the closest area so questions still fit, never dumped into a generic bucket.
 */
export function RolePicker({ position, roleId, onChange, composition }: Props) {
  const role = getRole(roleId);
  const [editing, setEditing] = useState(!position.trim());
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>(role ? domainOf(role).group : ROLE_GROUPS[0].id);
  const [domain, setDomain] = useState<string | null>(role ? domainOf(role).id : null);

  const q = query.trim();
  const results: RoleMatch[] = useMemo(() => (q ? searchRoles(q, 10) : []), [q]);
  const resolution = useMemo(() => (q ? resolveRole(q) : null), [q]);

  const pick = (id: string) => {
    const r = getRole(id)!;
    onChange(r.ko, r.id);
    setQuery("");
    setEditing(false);
  };
  const submitCustom = (text: string) => {
    const t = text.trim().slice(0, LIMITS.position);
    if (!t) return;
    // An exact title or alias ("FE", "데이터 애널", "HRD") is simply that role.
    const exact = searchRoles(t, 1)[0];
    if (exact && exact.score >= 100) {
      pick(exact.role.id);
      return;
    }
    onChange(t, undefined);
    setQuery("");
    setEditing(false);
  };

  if (!editing && position.trim()) {
    return <Selected position={position} roleId={roleId} composition={composition} onEdit={() => setEditing(true)} onPick={pick} />;
  }

  const groupDomains = domainsInGroup(group);
  const activeDomain = domain && groupDomains.some((d) => d.id === domain) ? domain : groupDomains[0]?.id;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="role-search" className="label mb-2 block">
          직무 검색
        </label>
        <div className="relative">
          <input
            id="role-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0] && results[0].score >= 72) pick(results[0].role.id);
                else submitCustom(query);
              }
              if (e.key === "Escape" && position) setEditing(false);
            }}
            maxLength={LIMITS.position}
            autoComplete="off"
            placeholder="예: 회계, 퍼포먼스 마케팅, 간호사, 반도체 공정, 공무원"
            aria-describedby="role-search-hint"
            className="h-12 w-full rounded-lg border border-line-strong bg-surface pr-4 pl-10 text-[16px] text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
          />
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <p id="role-search-hint" className="mt-1.5 text-[12px] text-faint">
          {ROLE_STATS.domains}개 분야 {ROLE_STATS.roles}개 직무. 영어나 약어로도 찾을 수 있습니다 (FE, HRD, BM, Data Analyst)
        </p>
      </div>

      {q ? (
        <div className="space-y-3" aria-live="polite">
          {resolution?.broad && (
            <div className="rounded-lg border border-accent/25 bg-accent-soft/50 p-3.5">
              <p className="text-[13px] font-semibold text-ink">‘{q}’는 범위가 넓어요. 어떤 업무에 가까운가요?</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {resolution.suggestions.slice(0, 8).map((r) => (
                  <button key={r.id} type="button" className={chip(false)} onClick={() => pick(r.id)}>
                    {r.ko}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line" role="listbox" aria-label="직무 검색 결과">
              {results.slice(0, 8).map((m) => (
                <li key={m.role.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => pick(m.role.id)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-ink">
                        {m.role.ko}
                        {m.via && !m.role.ko.replace(/\s/g, "").includes(m.via.replace(/\s/g, "")) && <span className="ml-1.5 font-normal text-faint">· {m.via}</span>}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {m.domain.name} › {m.family.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-faint">{m.role.en}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!(results[0] && results[0].score >= 100) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
              <p className="min-w-0 text-[13px] text-muted">
                {results.length ? "찾는 직무가 없나요? " : "목록에 없는 직무예요. "}
                {resolution?.domain && resolution.kind === "inferred" ? (
                  <>
                    <b className="text-ink">{resolution.domain.name}</b> 분야 질문으로 구성합니다.
                  </>
                ) : (
                  "입력한 직무명 그대로 면접을 진행할 수 있어요."
                )}
              </p>
              <Button size="sm" variant="secondary" onClick={() => submitCustom(query)}>
                ‘{q.length > 14 ? `${q.slice(0, 13)}…` : q}’ 직접 입력으로 진행
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="label mb-2">1. 직무 분야</p>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="직무 분야">
              {ROLE_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={group === g.id}
                  className={chip(group === g.id)}
                  onClick={() => {
                    setGroup(g.id);
                    setDomain(null);
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <p className="label border-b border-line bg-surface-2 px-3.5 py-2">2. 직무 선택</p>
            <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">
              <ul className="scroll-thin flex gap-1 overflow-x-auto border-b border-line p-2 sm:max-h-[300px] sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0" aria-label="세부 분야">
                {groupDomains.map((d) => (
                  <li key={d.id} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={activeDomain === d.id}
                      onClick={() => setDomain(d.id)}
                      className={`w-full rounded-md px-2.5 py-1.5 text-left text-[13px] whitespace-nowrap ${activeDomain === d.id ? "bg-navy font-semibold text-white" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
                    >
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="scroll-thin max-h-[300px] space-y-3 overflow-y-auto p-3">
                {activeDomain &&
                  familiesInDomain(activeDomain).map((f) => (
                    <div key={f.id}>
                      <p className="mb-1.5 text-[12px] font-semibold text-faint">{f.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rolesInFamily(f.id).map((r) => (
                          <button key={r.id} type="button" className={chip(r.id === roleId)} onClick={() => pick(r.id)}>
                            {r.ko}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {position && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                취소
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Step 3: the chosen job, what the interview will focus on, and the question mix. */
function Selected({ position, roleId, composition, onEdit, onPick }: { position: string; roleId: string | undefined; composition: Props["composition"]; onEdit: () => void; onPick: (id: string) => void }) {
  const role = getRole(roleId);
  const resolution = useMemo(() => (role ? null : resolveRole(position)), [role, position]);
  const [profile, setProfile] = useState<RoleProfileDetail | null>(null);
  const profileId = role?.id ?? resolution?.suggestions[0]?.id;

  useEffect(() => {
    let alive = true;
    if (!profileId) return;
    loadProfiles()
      .then((all) => alive && setProfile(all[profileId] ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [profileId]);

  const where = role ? `${domainOf(role).name} › ${familyOf(role).name}` : resolution?.domain ? `${resolution.domain.name}${resolution.family ? ` › ${resolution.family.name}` : ""} (추정)` : "직접 입력";
  const skills = role ? profile?.skills : undefined;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-muted">{where}</p>
          <p className="mt-0.5 text-[17px] font-bold break-keep text-ink">{position}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          직무 변경
        </Button>
      </div>
      {skills && skills.length > 0 && (
        <p className="mt-2.5 flex flex-wrap gap-1">
          {skills.slice(0, 6).map((s) => (
            <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-accent">
              {s}
            </span>
          ))}
        </p>
      )}
      {!role && resolution && resolution.suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] text-muted">비슷한 직무를 고르면 질문이 더 정확해집니다</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {resolution.suggestions.slice(0, 5).map((r) => (
              <button key={r.id} type="button" className={chip(false)} onClick={() => onPick(r.id)}>
                {r.ko}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3.5 border-t border-accent/15 pt-3">
        <p className="text-[12px] font-semibold text-ink">직무에 맞는 질문으로 면접이 구성됩니다</p>
        <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {composition.map((c) => (
            <span key={c.bucket} style={{ width: `${c.pct}%` }} className={BUCKET_COLOR[c.bucket]} />
          ))}
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          {composition.map((c) => (
            <span key={c.bucket} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${BUCKET_COLOR[c.bucket]}`} aria-hidden />
              {BUCKET_LABEL[c.bucket].ko} {c.pct}%
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
