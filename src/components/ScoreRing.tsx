import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

/** Animated circular overall score (count-up + arc). */
export function ScoreRing({ score, size = 200 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, score, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [score, reduce]);

  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Overall score ${score} out of 100`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ * (1 - score / 100) : circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b7cf6" />
            <stop offset="1" stopColor="#6c8cff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-light text-ink tabular-nums sm:text-6xl">{shown}</span>
        <span className="font-mono text-xs tracking-[0.2em] text-faint">/ 100</span>
      </div>
    </div>
  );
}
