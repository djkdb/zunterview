import { motion } from "framer-motion";

/** Keeps the candidate's just-submitted answer visible while the AI works. */
export function LastAnswer({ text, label, lang }: { text: string; label: string; lang: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      lang={lang}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl rounded-2xl border border-line bg-surface-2/60 px-5 py-4"
    >
      <figcaption className="label mb-2">{label}</figcaption>
      <blockquote className="line-clamp-4 text-[15px] leading-relaxed text-muted">{text}</blockquote>
    </motion.figure>
  );
}
