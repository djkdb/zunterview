/**
 * Fish Audio text-to-speech (https://docs.fish.audio). The API key stays on the
 * server; each interviewer seat maps to its own Fish Audio voice model.
 *
 *   FISH_AUDIO_API_KEY=...            required to enable
 *   FISH_VOICE_CENTER=<model id>      면접위원장
 *   FISH_VOICE_LEFT=<model id>        인사팀 면접관
 *   FISH_VOICE_RIGHT=<model id>       실무 면접관
 *   FISH_VOICE_STAFF=<model id>       호명하는 안내 직원 (optional)
 *   FISH_VOICE_DEFAULT=<model id>     fallback for any seat without its own voice
 *   FISH_AUDIO_MODEL=s2.1-pro         optional TTS model header
 *   FISH_AUDIO_API_URL=...            optional endpoint override (proxy / testing)
 */
import type { Voice } from "../shared/schemas";

const API_URL = process.env.FISH_AUDIO_API_URL?.trim() || "https://api.fish.audio/v1/tts";

export function isFishConfigured(): boolean {
  return Boolean(process.env.FISH_AUDIO_API_KEY?.trim());
}

function voiceId(voice: Voice): string | undefined {
  const env = process.env;
  const own = { left: env.FISH_VOICE_LEFT, center: env.FISH_VOICE_CENTER, right: env.FISH_VOICE_RIGHT, staff: env.FISH_VOICE_STAFF }[voice];
  return own?.trim() || env.FISH_VOICE_DEFAULT?.trim() || undefined;
}

export class TtsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/* Small LRU so "질문 다시 듣기" and resumed interviews don't pay twice. */
const CACHE_MAX = 60;
const cache = new Map<string, Buffer>();
function remember(key: string, audio: Buffer) {
  cache.delete(key);
  cache.set(key, audio);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
}

export async function synthesize(text: string, voice: Voice, speed?: number): Promise<{ audio: Buffer; cached: boolean }> {
  const key = `${voice}|${speed ?? 1}|${text}`;
  const hit = cache.get(key);
  if (hit) {
    remember(key, hit);
    return { audio: hit, cached: true };
  }

  const reference = voiceId(voice);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (process.env.FISH_AUDIO_MODEL?.trim()) headers.model = process.env.FISH_AUDIO_MODEL.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        text,
        ...(reference ? { reference_id: reference } : {}),
        format: "mp3",
        mp3_bitrate: 128,
        latency: "balanced",
        normalize: true,
        ...(speed && speed !== 1 ? { prosody: { speed } } : {}),
      }),
    });
  } catch {
    throw new TtsError(504, "Fish Audio did not respond");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new TtsError(res.status === 401 || res.status === 402 ? 503 : 502, `Fish Audio error ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw new TtsError(502, "Fish Audio returned no audio");
  remember(key, audio);
  return { audio, cached: false };
}
