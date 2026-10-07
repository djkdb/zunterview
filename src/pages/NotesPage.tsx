import { useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { DownloadIcon } from "../components/ui/icons";
import { ScoreBadge } from "../components/ScoreBadge";
import { track } from "../services/events";
import { shortDate } from "../utils/format";
import { NOTE_GROUP_KO, NOTE_GROUPS, REVIEW_BELOW, buildNotebook, notebookText, sortForReview, type Note, type NoteGroup } from "../utils/notebook";
import { scoreTone } from "../utils/scoring";
import { loadFullInterviews, loadScripts, saveScript } from "../utils/storage";

type Filter = "all" | "review" | "written" | NoteGroup;

interface Props {
  onStart: () => void;
  onHistory: () => void;
  onHome: () => void;
}

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `면접-답변-노트-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Every question the candidate has faced, what they said, and the answer they mean to give next time. */
export function NotesPage({ onStart, onHistory, onHome }: Props) {
  const [version, setVersion] = useState(0);
  const notes = useMemo(() => {
    void version;
    return sortForReview(buildNotebook(loadFullInterviews(), loadScripts()));
  }, [version]);
  const [filter, setFilter] = useState<Filter>("all");
  const [hide, setHide] = useState(false);

  const review = notes.filter((n) => n.best !== null && n.best < REVIEW_BELOW);
  const written = notes.filter((n) => n.script);
  const shown = notes.filter((n) =>
    filter === "all" ? true : filter === "review" ? review.includes(n) : filter === "written" ? Boolean(n.script) : n.group === filter,
  );
  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "전체", count: notes.length },
    { id: "review", label: `${REVIEW_BELOW}점 미만`, count: review.length },
    { id: "written", label: "정리한 답", count: written.length },
    ...NOTE_GROUPS.map((g) => ({ id: g as Filter, label: NOTE_GROUP_KO[g], count: notes.filter((n) => n.group === g).length })),
  ];

  return (
    <div className="min-h-dvh pb-16">
      <TopBar
        onHome={onHome}
        right={
          <>
            <Button size="sm" variant="ghost" onClick={onHistory}>
              면접 기록
            </Button>
            <Button size="sm" variant="primary" onClick={onStart}>
              새 면접 보기
            </Button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="pt-8 pb-5">
          <p className="text-sm font-semibold text-accent">답변 노트</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-navy">실전 전에 다시 볼 질문</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            지금까지 받은 질문과 내 답, 면접관이 짚은 점을 한곳에 모았습니다. 점수가 낮았던 질문이 위에 옵니다. 실전에서 말할 답을 적어 두면 면접 기록이 지워져도 남습니다.
          </p>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="font-semibold text-ink">아직 모인 질문이 없습니다.</p>
            <p className="mt-1.5 text-[14px] text-muted">면접을 한 번 보면 받은 질문과 내 답이 여기에 쌓입니다.</p>
            <Button variant="primary" className="mt-5" onClick={onStart}>
              면접 접수하기
            </Button>
          </div>
        ) : (
          <>
            <div className="z-20 -mx-4 border-b sm:sticky sm:top-16 border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="radiogroup" aria-label="질문 고르기">
                {chips
                  .filter((c) => c.id === "all" || c.count > 0)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={filter === c.id}
                      onClick={() => setFilter(c.id)}
                      className={`shrink-0 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
                        filter === c.id ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-muted hover:text-ink"
                      }`}
                    >
                      {c.label} <span className="tabular-nums opacity-70">{c.count}</span>
                    </button>
                  ))}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                  <input type="checkbox" checked={hide} onChange={(e) => {
                      setHide(e.target.checked);
                      if (e.target.checked) track("notes_drill");
                    }} className="h-4 w-4 accent-accent" />
                  답 가리고 말해 보기
                </label>
                <Button size="sm" variant="ghost" icon={<DownloadIcon width={15} height={15} />} onClick={() => {
                    download(notebookText(shown));
                    track("notes_downloaded", { count: shown.length });
                  }}>
                  보이는 질문 내려받기
                </Button>
              </div>
            </div>

            {hide && (
              <p className="mt-4 rounded-lg border border-accent/25 bg-accent-soft px-3 py-2.5 text-[13px] text-ink/90">
                질문만 보고 소리 내어 답해 보세요. 다 말한 뒤 ‘내 답 보기’로 적어 둔 답과 비교하면 됩니다.
              </p>
            )}

            <ol className="mt-4 space-y-3">
              {shown.map((n) => (
                <NoteCard key={`${n.key}:${hide}`} note={n} hide={hide} onSaved={() => setVersion((v) => v + 1)} />
              ))}
            </ol>
            <p className="mt-5 text-[12px] text-faint">노트는 이 브라우저에만 저장됩니다. 면접 기록은 최근 10회까지 보관되고, 직접 적은 답은 기록과 따로 남습니다.</p>
          </>
        )}
      </main>
    </div>
  );
}

function NoteCard({ note: n, hide, onSaved }: { note: Note; hide: boolean; onSaved: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(n.script?.text ?? "");
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const last = n.attempts[0];
  const open = !hide || revealed;
  const dirty = draft.trim() !== (n.script?.text ?? "").trim();

  const save = () => {
    if (!dirty) return;
    const ok = saveScript(n.key, n.question, draft);
    setSaved(ok ? "saved" : "failed");
    if (ok) {
      track("note_written");
      onSaved();
    }
  };

  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
            {n.isFollowUp && <span className="rounded bg-accent px-1.5 py-px font-semibold text-white">↳ 꼬리질문</span>}
            {[n.group && NOTE_GROUP_KO[n.group], last?.where, n.attempts.length > 1 && `답한 횟수 ${n.attempts.length}번`].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-[16px] leading-snug font-bold text-ink">{n.question}</p>
          {last?.parent && <p className="mt-1 text-[12px] text-faint">‘{last.parent}’에 이어진 질문</p>}
        </div>
        {n.best !== null && (
          <span className="shrink-0 text-right">
            <ScoreBadge score={n.best} tone={scoreTone(n.best)} />
            <span className="mt-1 block text-[10px] text-faint">최고 점수</span>
          </span>
        )}
      </div>

      {!open ? (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setRevealed(true)}>
          내 답 보기
        </Button>
      ) : (
        <div className="mt-3 space-y-3 text-[14px] leading-relaxed">
          <div>
            <label htmlFor={`script-${n.key}`} className="mb-1 flex items-center justify-between text-[12px] font-semibold text-muted">
              <span>실전에서 말할 답</span>
              <span className="font-normal text-faint" role="status">
                {saved === "saved" && !dirty ? "저장했습니다" : saved === "failed" ? "저장하지 못했습니다" : ""}
              </span>
            </label>
            <textarea
              id={`script-${n.key}`}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved("idle");
              }}
              onBlur={save}
              rows={draft ? Math.min(8, Math.max(3, Math.ceil(draft.length / 60))) : 2}
              maxLength={1500}
              placeholder="결론 한 문장, 근거가 되는 경험, 결과 순서로 적어 보세요."
              className="w-full resize-y rounded-lg border border-line-strong bg-surface-2/50 px-3 py-2 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent focus:bg-surface"
            />
            {!draft && last && (
              <button type="button" className="mt-1 text-[12px] font-semibold text-accent hover:underline" onClick={() => setDraft(last.answer)}>
                최근 답변을 옮겨 와서 고치기
              </button>
            )}
          </div>
          {last && (
            <div className="rounded-lg bg-surface-2/70 px-3 py-2.5">
              <p className="text-[12px] text-faint">
                최근 답변 · {shortDate(last.at)} · <span className="tabular-nums">{last.score}점</span>
              </p>
              <p className="mt-0.5 text-ink/90">{last.answer}</p>
              <p className="mt-2 text-[13px] text-warn">고칠 점: {last.improve}</p>
              <p className="mt-1 text-[13px] text-muted">
                <span className="text-faint">예시(참고용):</span> <i>{last.example}</i>
              </p>
            </div>
          )}
          {hide && (
            <button type="button" className="text-[12px] font-semibold text-muted hover:text-ink" onClick={() => setRevealed(false)}>
              다시 가리기
            </button>
          )}
        </div>
      )}
    </li>
  );
}
