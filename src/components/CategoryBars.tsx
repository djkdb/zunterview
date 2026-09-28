import { motion } from "framer-motion";
import { CATEGORY_KEYS, type CategoryKey } from "../../shared/schemas";
import { CATEGORY_LABEL } from "../../shared/labels";
import type { CategoryScores } from "../types/interview";
import { scoreTone } from "../utils/scoring";
import { TONE_BG } from "../utils/tones";

export function CategoryBars({ scores, highlight }: { scores: CategoryScores; highlight?: { strongest: CategoryKey; weakest: CategoryKey } }) {
  return (
    <ul className="space-y-3.5">
      {CATEGORY_KEYS.map((k, i) => (
        <li key={k}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              {CATEGORY_LABEL[k]}
              {highlight?.strongest === k && <span className="ml-2 text-good">▲ strongest</span>}
              {highlight?.weakest === k && <span className="ml-2 text-warn">▼ focus</span>}
            </span>
            <span className="font-mono text-sm text-ink tabular-nums">{scores[k]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className={`h-full rounded-full ${TONE_BG[scoreTone(scores[k])]}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${scores[k]}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: "easeOut" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
