/**
 * Interviewer voice output. Uses the server's neural TTS (ElevenLabs or Fish Audio, through our /api/tts, so the key
 * stays on the server) when the server has it configured — each interviewer
 * gets a distinct neural voice — and falls back to the browser's speech engine.
 */
import type { Voice } from "../../../shared/schemas";
import { API_BASE_URL } from "../../config/env";
import { cancelSpeech, isSpeechSynthesisSupported, speak, type VoiceOptions } from "./speechSynthesis";

let neural = false;
export function setNeuralTts(enabled: boolean) {
  neural = enabled;
}
export const isNeuralTts = () => neural;
export const isVoiceOutputAvailable = (): boolean => neural || isSpeechSynthesisSupported();

export interface LineOptions extends VoiceOptions {
  voice: Voice;
  lang: string;
}

let generation = 0;
let playing: { audio: HTMLAudioElement; url: string; done: () => void } | null = null;
let fetching: AbortController | null = null;

function stopAudio() {
  fetching?.abort();
  fetching = null;
  if (playing) {
    const p = playing;
    playing = null;
    p.audio.pause();
    URL.revokeObjectURL(p.url);
    p.done();
  }
}

async function playNeural(text: string, opts: LineOptions, gen: number): Promise<"played" | "cancelled"> {
  const controller = new AbortController();
  fetching = controller;
  const timer = setTimeout(() => controller.abort(), 15_000);
  let blob: Blob;
  try {
    const res = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 400), voice: opts.voice, ...(opts.rate && Math.abs(opts.rate - 1) > 0.02 ? { speed: opts.rate } : {}) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    blob = await res.blob();
  } catch (e) {
    if (gen !== generation) return "cancelled";
    throw e;
  } finally {
    clearTimeout(timer);
    if (fetching === controller) fetching = null;
  }
  if (gen !== generation) return "cancelled";

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise((resolve, reject) => {
    const done = () => resolve(gen === generation ? "played" : "cancelled");
    playing = { audio, url, done };
    const finish = () => {
      if (playing?.audio === audio) {
        playing = null;
        URL.revokeObjectURL(url);
      }
      done();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch((e) => {
      // Autoplay blocked or decode error — let the caller fall back.
      if (playing?.audio === audio) {
        playing = null;
        URL.revokeObjectURL(url);
      }
      reject(e);
    });
  });
}

/** Speak one interviewer line; resolves when finished, skipped, or failed (never rejects). */
export async function speakLine(text: string, opts: LineOptions): Promise<void> {
  if (!text.trim()) return;
  cancelLine();
  const gen = ++generation;
  if (neural) {
    try {
      await playNeural(text, opts, gen);
      return;
    } catch {
      if (gen !== generation) return;
      // Neural TTS unavailable (network, quota…): use the browser voice instead.
    }
  }
  if (isSpeechSynthesisSupported()) await speak(text, opts.lang, opts);
}

export function cancelLine() {
  generation++;
  stopAudio();
  cancelSpeech();
}
