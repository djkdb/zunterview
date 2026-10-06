import { blueprintFor } from "../../shared/blueprints";
import { roleContextFor } from "../../shared/roles";
import { josa } from "../../shared/korean";
import type { InterviewConfig } from "../types/interview";

/**
 * Setup: how this job's interviewer digs into an answer, shown before the interview so the
 * candidate can prepare each step (the same path drives the follow-up questions).
 */
export function FollowUpPath({ config }: { config: InterviewConfig }) {
  const role = roleContextFor(config);
  const bp = blueprintFor(role.archetype);
  const lang = config.language;
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="follow-up-path">
      <h2 id="follow-up-path" className="text-[15px] font-bold text-ink">
        {role.title} 면접관은 이렇게 파고듭니다
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        경험을 이야기하면 {bp.label.ko} 직무 면접관은 아래 순서로 꼬리질문을 이어 갑니다. 이미 답한 단계는 건너뜁니다. 대표 경험마다 각 단계에 한 문장씩 답을 준비해 두세요.
      </p>
      <ol className="mt-4 space-y-2">
        {bp.chain.map((step, i) => (
          <li key={step.key} className="flex gap-3 text-[14px] leading-relaxed">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-navy tabular-nums">{i + 1}</span>
            <span className="text-ink">{step.ask[lang]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
        항목별 점수와 함께 <b className="text-ink">{bp.signal.label[lang]}</b>{josa(bp.signal.label[lang], "을/를")} 따로 봅니다. {bp.signal.present[lang]}
      </p>
      {config.difficulty === "hard" && (
        <p className="mt-2 text-[13px] text-muted">
          압박 면접에서는 좋은 답에도 이렇게 되묻습니다: {bp.pressure.map((p) => `“${p[lang]}”`).join(" ")}
        </p>
      )}
    </section>
  );
}
