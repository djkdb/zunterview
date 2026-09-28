/** Text-to-speech for the interviewer's voice (browser speechSynthesis). */

export const isSpeechSynthesisSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

let voicesCache: SpeechSynthesisVoice[] = [];
if (isSpeechSynthesisSupported()) {
  const load = () => (voicesCache = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.slice(0, 2).toLowerCase();
  const matches = voicesCache.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  return (
    matches.find((v) => /google|natural|neural|premium|enhanced/i.test(v.name)) ??
    matches.find((v) => v.localService) ??
    matches[0]
  );
}

let current: { resolve: () => void } | null = null;

/** Speaks `text`; resolves when finished, cancelled, or failed (never rejects). */
export function speak(text: string, lang: string): Promise<void> {
  if (!isSpeechSynthesisSupported() || !text.trim()) return Promise.resolve();
  cancelSpeech();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang.startsWith("ko") ? 1.05 : 1.0;
    u.pitch = 1;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;

    // Some browsers never fire `end`; cap by an estimated duration.
    const estimateMs = Math.min(30_000, 1200 + text.length * (lang.startsWith("ko") ? 110 : 65));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(safety);
      if (current?.resolve === finish) current = null;
      resolve();
    };
    const safety = setTimeout(finish, estimateMs + 2500);
    u.onend = finish;
    u.onerror = finish;
    current = { resolve: finish };
    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech() {
  if (!isSpeechSynthesisSupported()) return;
  const c = current;
  current = null;
  window.speechSynthesis.cancel();
  c?.resolve();
}
