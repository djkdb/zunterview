/**
 * Interviewer text-to-speech. API keys stay on the server; each interviewer seat has its own voice.
 * Configured providers are tried in order (Typecast, ElevenLabs, Fish Audio); when one fails
 * (no credit, outage) the next one reads the line, so the panel keeps its neural voices.
 *
 * Typecast (https://typecast.ai/docs): Korean voices
 *   TYPECAST_API_KEY=...               enables it (secret, server env only)
 *   TYPECAST_VOICE_CENTER / _LEFT / _RIGHT / _STAFF / _DEFAULT = <tc_ voice id>   optional seat overrides
 *   TYPECAST_MODEL=ssfm-v30            optional
 *   TYPECAST_API_URL=...               optional endpoint override (proxy / testing)
 *
 * ElevenLabs (https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
 *   ELEVEN_API_KEY=...                 enables it (ELEVENLABS_API_KEY also works; secret, server env only)
 *   ELEVEN_VOICE_CENTER / _LEFT / _RIGHT / _STAFF / _DEFAULT = <voice id>   optional seat overrides
 *   (Voice Library voices need a paid ElevenLabs plan for API use; see ELEVEN_PREMADE below)
 *   ELEVEN_MODEL=eleven_multilingual_v2   optional (eleven_flash_v2_5 is faster and half the credits)
 *   ELEVEN_API_URL=...                 optional endpoint override (proxy / testing)
 *
 * Fish Audio (https://docs.fish.audio)
 *   FISH_AUDIO_API_KEY=...             enables it (secret, server env only)
 *   FISH_VOICE_CENTER / _LEFT / _RIGHT / _STAFF / _DEFAULT = <model id>     optional seat overrides
 *   FISH_AUDIO_MODEL=s2.1-pro          optional TTS model header
 *   FISH_AUDIO_API_URL=...             optional endpoint override (proxy / testing)
 */
import type { Voice } from "../shared/schemas";

export type TtsProvider = "typecast" | "elevenlabs" | "fish";

const env = (k: string) => process.env[k]?.trim() || "";
const elevenKey = () => env("ELEVEN_API_KEY") || env("ELEVENLABS_API_KEY");

/** Configured providers, in the order they are tried. */
export function ttsProviders(): TtsProvider[] {
  return [env("TYPECAST_API_KEY") ? "typecast" : null, elevenKey() ? "elevenlabs" : null, env("FISH_AUDIO_API_KEY") ? "fish" : null].filter((p): p is TtsProvider => p !== null);
}

export const isTtsConfigured = (): boolean => ttsProviders().length > 0;

/**
 * Built-in voices (public ids, not secrets), so a deployment only needs an API key.
 * Typecast: Korean voices from its catalog (GET /v2/voices).
 * ElevenLabs: Korean voices from the Voice Library, added to the project's ElevenLabs account.
 * Library voices need a paid plan through the API; on a free plan (or another account that hasn't
 * added them) each seat falls back to a default voice every account has (ELEVEN_PREMADE).
 * Fish Audio: fish.audio/app/text-to-speech/?modelId=<id> plays each one.
 */
const BUILT_IN: Record<TtsProvider, Record<Voice, string>> = {
  typecast: {
    left: "tc_69f2e455ea79fd197aa0476f", // 이서연 책임 (인사팀): Seohyeon, announcer-like young female
    center: "tc_685cdfad4027aeec7d097a28", // 김도윤 팀장 (면접위원장): Cheolhoon, middle-aged male
    right: "tc_686dc43ebd6351e06ee64d74", // 박준호 선임 (실무): Wonwoo, conversational young male
    staff: "tc_68785db8ba9cd7503f27d921", // 안내 직원 (호명): Gowoon
  },
  elevenlabs: {
    left: "hmewQCBsQh48wGHkpNwo", // 이서연 책임 (인사팀): Juha, calm and trustworthy female
    center: "s07IwTCOrCDCaETjUVjx", // 김도윤 팀장 (면접위원장): Hyunbin, measured middle-aged male
    right: "l6fNdLYgoqjfTIPUeFc9", // 박준호 선임 (실무): MJ, clear conversational male
    staff: "KlstlYt9VVf3zgie2Oht", // 안내 직원 (호명): Sola, announcement voice
  },
  fish: {
    left: "3d31499f0e13438bbce8dcce7b7c4298",
    center: "7bae2c48d30048c3a27b946279ac05ef",
    right: "d7ec83d63be940f19abd933eb7b28816",
    staff: "7bae2c48d30048c3a27b946279ac05ef",
  },
};

/** ElevenLabs default voices: usable on every plan, read in Korean by the multilingual model. */
const ELEVEN_PREMADE: Record<Voice, string> = {
  left: "EXAVITQu4vr4xnSDxMaL", // Sarah
  center: "JBFqnCBsd6RMkjVDRZzb", // George
  right: "iP95p4xoKVk53GoZ742B", // Chris
  staff: "cgSgspJ2msm6clMCkdW9", // Jessica
};

export function voiceId(voice: Voice, provider: TtsProvider = "fish"): string {
  const prefix = { typecast: "TYPECAST_VOICE_", elevenlabs: "ELEVEN_VOICE_", fish: "FISH_VOICE_" }[provider];
  return env(prefix + voice.toUpperCase()) || env(`${prefix}DEFAULT`) || BUILT_IN[provider][voice];
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

export async function synthesize(text: string, voice: Voice, speed?: number): Promise<{ audio: Buffer; cached: boolean; provider: TtsProvider }> {
  const providers = ttsProviders();
  for (const provider of providers) {
    const hit = cache.get(`${provider}|${voice}|${speed ?? 1}|${text}`);
    if (hit) return { audio: hit, cached: true, provider };
  }
  let last: TtsError | null = null;
  const now = Date.now();
  // A provider that refused the account (bad key, no credit, blocked) sits out for a while instead of
  // being asked, and refusing, before every line; the last one is still tried so a line is never lost.
  const ready = providers.filter((p) => (resting.get(p) ?? 0) <= now);
  for (const provider of ready.length ? ready : providers.slice(-1)) {
    try {
      const audio = await { typecast, elevenlabs: eleven, fish }[provider](text, voice, speed);
      resting.delete(provider);
      remember(`${provider}|${voice}|${speed ?? 1}|${text}`, audio);
      return { audio, cached: false, provider };
    } catch (err) {
      last = err instanceof TtsError ? err : new TtsError(502, String(err));
      const refused = / 40[1-3]\b/.test(last.message);
      if (refused) resting.set(provider, now + REST_MS);
      if (providers.length > 1) console.warn(`[tts] ${provider} failed${refused ? ` (skipped for ${REST_MS / 60_000} min)` : ""}, trying the next provider — ${last.message}`);
    }
  }
  throw last ?? new TtsError(503, "no TTS provider configured");
}

/** Providers that refused the account recently, until when (ms). */
const resting = new Map<TtsProvider, number>();
const REST_MS = 10 * 60_000;
export const resetTtsState = () => {
  resting.clear();
  cache.clear();
  unusableVoices.clear();
};

/** POST with a timeout; turns a failed response into a TtsError whose message says why (logged server-side only). */
async function post(name: string, url: string, headers: Record<string, string>, body: unknown): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, signal: controller.signal, body: JSON.stringify(body) });
  } catch {
    throw new TtsError(504, `${name} did not respond`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    throw new TtsError(res.status === 401 || res.status === 402 ? 503 : 502, `${name} ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw new TtsError(502, `${name} returned no audio`);
  return audio;
}

function typecast(text: string, voice: Voice, speed?: number): Promise<Buffer> {
  return post("Typecast", env("TYPECAST_API_URL") || "https://api.typecast.ai/v1/text-to-speech", { "X-API-KEY": env("TYPECAST_API_KEY") }, {
    voice_id: voiceId(voice, "typecast"),
    text,
    model: env("TYPECAST_MODEL") || "ssfm-v30",
    language: /[가-힣]/.test(text) ? "kor" : "eng",
    prompt: { emotion_preset: "normal", emotion_intensity: 1 },
    output: { audio_format: "mp3", ...(speed && speed !== 1 ? { audio_tempo: Math.min(2, Math.max(0.5, speed)) } : {}) },
  });
}

/** Voice ids this account can't use through the API (free plan, not in its library); skipped until restart. */
const unusableVoices = new Set<string>();

async function eleven(text: string, voice: Voice, speed?: number): Promise<Buffer> {
  const base = env("ELEVEN_API_URL") || "https://api.elevenlabs.io/v1/text-to-speech";
  const body = {
    text,
    model_id: env("ELEVEN_MODEL") || "eleven_multilingual_v2",
    language_code: /[가-힣]/.test(text) ? "ko" : undefined,
    // Steady, unhurried interviewer delivery. ElevenLabs accepts speed 0.7–1.2.
    voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0, use_speaker_boost: true, ...(speed && speed !== 1 ? { speed: Math.min(1.2, Math.max(0.7, speed)) } : {}) },
  };
  const call = (id: string) => post("ElevenLabs", `${base}/${encodeURIComponent(id)}?output_format=mp3_44100_128`, { "xi-api-key": elevenKey(), Accept: "audio/mpeg" }, body);
  const chosen = voiceId(voice, "elevenlabs");
  const premade = ELEVEN_PREMADE[voice];
  if (chosen === premade || unusableVoices.has(chosen)) return call(premade);
  try {
    return await call(chosen);
  } catch (err) {
    // A library voice on a free plan (402 paid_plan_required) or a voice this account doesn't have.
    if (!(err instanceof TtsError) || !/paid_plan_required|voice_not_found|ElevenLabs 40[24]/.test(err.message)) throw err;
    unusableVoices.add(chosen);
    console.warn(`[tts] ElevenLabs voice ${chosen} (${voice}) can't be used with this plan or account; using a default voice instead`);
    return call(premade);
  }
}

function fish(text: string, voice: Voice, speed?: number): Promise<Buffer> {
  const headers: Record<string, string> = { Authorization: `Bearer ${env("FISH_AUDIO_API_KEY")}` };
  if (env("FISH_AUDIO_MODEL")) headers.model = env("FISH_AUDIO_MODEL");
  return post("Fish Audio", env("FISH_AUDIO_API_URL") || "https://api.fish.audio/v1/tts", headers, {
    text,
    reference_id: voiceId(voice, "fish"),
    format: "mp3",
    mp3_bitrate: 128,
    latency: "balanced",
    normalize: true,
    ...(speed && speed !== 1 ? { prosody: { speed } } : {}),
  });
}
