import { useMemo, useState } from "react";
import { COMPANIES } from "../../shared/companies";
import { buildPlan, dayKey, daysBetween, dLabel, type InterviewPlan, type PracticeState, type TaskKind } from "../utils/plan";
import { Button } from "./ui/Button";

interface Props {
  plan: InterviewPlan | null;
  state: PracticeState;
  defaultPosition: string;
  onSave: (plan: InterviewPlan) => void;
  onClear: () => void;
  onAction: (kind: TaskKind) => void;
}

const ACTION: Record<TaskKind, string> = {
  intro: "연습하기",
  full: "면접 보기",
  rehearsal: "면접 보기",
  weak: "다시 답하기",
  gaps: "빈칸 채우기",
  script: "노트 열기",
  review: "노트 열기",
};

const longDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const w = "일월화수목금토"[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${w})`;
};

/** 면접 준비 플랜 on the landing page: set the interview date, then see today's tasks. */
export function PlanCard({ plan, state, defaultPosition, onSave, onClear, onAction }: Props) {
  // The page is reopened often enough that "today" can be fixed when it mounts.
  const [today] = useState(() => dayKey(Date.now()));
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const days = useMemo(() => (plan ? buildPlan(plan, state, today) : []), [plan, state, today]);

  if (!plan || editing) return <PlanForm initial={plan} defaultPosition={defaultPosition} today={today} onCancel={plan ? () => setEditing(false) : undefined} onSave={(p) => {
    onSave(p);
    setEditing(false);
  }} />;

  const left = daysBetween(today, plan.date);
  const where = `${plan.company ? `${plan.company} ` : ""}${plan.position}`;
  if (left < 0)
    return (
      <section className="rounded-xl border border-line bg-surface px-5 py-4" aria-label="면접 준비 플랜">
        <p className="text-[15px] font-bold text-navy">{where} 면접은 어떠셨나요?</p>
        <p className="mt-1 text-[13px] text-muted">{longDay(plan.date)} 면접이 지났습니다. 다음 면접 날짜를 넣으면 새 계획을 짭니다.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="primary" onClick={() => setEditing(true)}>
            다음 면접 날짜 넣기
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            계획 지우기
          </Button>
        </div>
      </section>
    );

  const todayPlan = days[0];
  const done = todayPlan.tasks.filter((t) => t.done).length;
  return (
    <section className="rounded-xl border border-navy/20 bg-surface shadow-[0_10px_30px_-20px_rgba(15,27,46,0.4)]" aria-label="면접 준비 플랜">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4">
        <span className="rounded-lg bg-navy px-3 py-1.5 tabular-nums text-[20px] font-extrabold text-white">{dLabel(left)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-navy">{where} 면접</p>
          <p className="text-[13px] text-muted">{longDay(plan.date)}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-[12px] font-semibold text-muted hover:text-ink">
          날짜 바꾸기
        </button>
      </div>
      <div className="px-5 py-4">
        <p className="mb-2 flex items-center justify-between text-[13px] font-semibold text-ink">
          오늘 할 일
          <span className="tabular-nums text-faint">
            {done}/{todayPlan.tasks.length}
          </span>
        </p>
        <ul className="space-y-2">
          {todayPlan.tasks.map((t) => (
            <li key={t.kind} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${t.done ? "border-good/25 bg-good/[0.05]" : "border-line"}`}>
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${t.done ? "bg-good text-white" : "border border-line-strong text-transparent"}`} aria-hidden>
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-semibold ${t.done ? "text-muted line-through decoration-good/50" : "text-ink"}`}>{t.title}</span>
                <span className="block text-[12px] leading-relaxed text-muted">{t.done ? "오늘 했습니다." : t.detail}</span>
              </span>
              {!t.done && (
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onAction(t.kind)}>
                  {ACTION[t.kind]}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {days.length > 1 && (
          <>
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="mt-3 text-[12px] font-semibold text-accent hover:text-navy">
              {showAll ? "남은 일정 접기" : `남은 일정 ${days.length - 1}일 보기`}
            </button>
            {showAll && (
              <ol className="mt-2 divide-y divide-line rounded-lg border border-line">
                {days.slice(1).map((d) => (
                  <li key={d.date} className="flex gap-3 px-3 py-2 text-[13px]">
                    <span className="w-12 shrink-0 tabular-nums font-bold text-navy">{dLabel(d.dLeft)}</span>
                    <span className="w-24 shrink-0 text-faint">{longDay(d.date).replace(/^\d+월 /, "")}</span>
                    <span className="text-ink">{d.tasks.map((t) => t.title).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        <p className="mt-3 text-[11px] text-faint">한 연습은 자동으로 체크됩니다. 계획과 기록은 이 브라우저에만 저장됩니다.</p>
      </div>
    </section>
  );
}

function PlanForm({ initial, defaultPosition, today, onSave, onCancel }: { initial: InterviewPlan | null; defaultPosition: string; today: string; onSave: (p: InterviewPlan) => void; onCancel?: () => void }) {
  const [date, setDate] = useState(initial && initial.date >= today ? initial.date : "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [position, setPosition] = useState(initial?.position || defaultPosition);
  const ok = date >= today && position.trim().length > 0;
  return (
    <section className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4" aria-label="면접 준비 플랜 만들기">
      <p className="text-[15px] font-bold text-navy">면접 날짜가 정해졌나요?</p>
      <p className="mt-1 text-[13px] text-muted">날짜를 넣으면 남은 날마다 할 연습을 짜고, 한 연습은 자동으로 체크합니다.</p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSave({ date, company: company.trim(), position: position.trim(), createdAt: Date.now() });
        }}
      >
        <label className="text-[12px] text-muted">
          면접 날짜
          <input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border border-line-strong bg-surface px-2.5 py-2 text-[14px] text-ink focus:border-accent focus:outline-none" />
        </label>
        <label className="text-[12px] text-muted">
          기업 (선택)
          <input list="plan-companies" value={company} onChange={(e) => setCompany(e.target.value.slice(0, 40))} placeholder="예: 삼성전자" className="mt-1 block w-full rounded-md border border-line-strong bg-surface px-2.5 py-2 text-[14px] text-ink focus:border-accent focus:outline-none" />
          <datalist id="plan-companies">
            {COMPANIES.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </label>
        <label className="text-[12px] text-muted">
          지원 직무
          <input required value={position} onChange={(e) => setPosition(e.target.value.slice(0, 40))} placeholder="예: 백엔드 개발자" className="mt-1 block w-full rounded-md border border-line-strong bg-surface px-2.5 py-2 text-[14px] text-ink focus:border-accent focus:outline-none" />
        </label>
        <span className="flex gap-2">
          <Button type="submit" size="md" variant="primary" disabled={!ok}>
            계획 만들기
          </Button>
          {onCancel && (
            <Button size="md" variant="ghost" onClick={onCancel}>
              취소
            </Button>
          )}
        </span>
      </form>
    </section>
  );
}
