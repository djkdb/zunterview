import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

/** Animated circular overall score (count-up + arc). */
export function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, score, { duration: 1.3, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [score, reduce]);

  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`종합 점수 100점 만점에 ${score}점`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e7e2d9" strokeWidth="7" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#1f4a86"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ * (1 - score / 100) : circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 1.3, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-semibold text-navy tabular-nums">{shown}</span>
        <span className="text-[12px] text-faint">/ 100점</span>
      </div>
    </div>
  );
}
