import { useState } from "react";
import { track } from "../services/events";
import { Button } from "./ui/Button";

/** One question after the sheet: was it useful? Optional comment, sent without the interview. */
export function SheetFeedback({ score, mode }: { score: number | null; mode: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const send = (r: 1 | -1, text = "") => {
    track("feedback", { rating: r, mode, score: Math.round((score ?? 0) / 10) * 10, ...(text.trim() ? { comment: text.trim().slice(0, 300) } : {}) });
  };

  if (sent) return <p className="no-print mt-8 text-center text-[13px] text-muted">의견 고맙습니다. 다음 면접관을 다듬는 데 쓰겠습니다.</p>;

  return (
    <section className="no-print mx-auto mt-10 max-w-xl rounded-xl border border-line bg-surface p-5" aria-labelledby="sheet-feedback">
      <h2 id="sheet-feedback" className="text-[15px] font-bold text-ink">
        이 평가표가 연습에 도움이 됐나요?
      </h2>
      <div className="mt-3 flex gap-2">
        {([
          [1, "도움이 됐어요"],
          [-1, "아쉬웠어요"],
        ] as const).map(([r, label]) => (
          <Button
            key={r}
            size="sm"
            variant={rating === r ? "primary" : "secondary"}
            aria-pressed={rating === r}
            onClick={() => {
              setRating(r);
              send(r);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {rating !== null && (
        <div className="mt-3">
          <label htmlFor="feedback-comment" className="text-[13px] text-muted">
            {rating === 1 ? "어떤 점이 좋았는지" : "무엇이 아쉬웠는지"} 한 줄 남겨 주세요(선택). 이름이나 연락처는 쓰지 마세요.
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            rows={2}
            className="mt-1.5 w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={!comment.trim()}
              onClick={() => {
                send(rating, comment);
                setSent(true);
              }}
            >
              의견 보내기
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
