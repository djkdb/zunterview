import { motion } from "framer-motion";

/** Keeps the candidate's just-submitted answer visible while the panel reviews it. */
export function LastAnswer({ text, label, lang }: { text: string; label: string; lang: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      lang={lang}
      className="w-full rounded-xl border border-dashed border-line-strong bg-surface-2 px-5 py-3.5"
    >
      <figcaption className="label mb-1.5">{label}</figcaption>
      <blockquote className="line-clamp-3 text-[15px] leading-relaxed text-muted">{text}</blockquote>
    </motion.figure>
  );
}
