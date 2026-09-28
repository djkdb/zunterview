import { motion } from "framer-motion";

/** Replaces the (disabled) answer box while the panel is busy, so nothing is covered. */
export function WaitingBar({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      role="status"
      className="flex h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 text-[14px] text-muted shadow-sm"
    >
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: `iv-dot 1s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </span>
      {text}
    </motion.div>
  );
}
