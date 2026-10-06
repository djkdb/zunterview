import { afterEach, describe, expect, it, vi } from "vitest";
import { synthesize, ttsProviders, voiceId } from "./tts";

afterEach(() => vi.unstubAllEnvs());

describe("voiceId", () => {
  it("gives every seat a built-in voice, so a deployment only needs the API key", () => {
    for (const k of ["FISH_VOICE_LEFT", "FISH_VOICE_CENTER", "FISH_VOICE_RIGHT", "FISH_VOICE_STAFF", "FISH_VOICE_DEFAULT"]) vi.stubEnv(k, "");
    const ids = (["left", "center", "right", "staff"] as const).map((v) => voiceId(v));
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set(ids.slice(0, 3)).size).toBe(3);
  });

  it("lets the environment override a seat, then all seats", () => {
    vi.stubEnv("FISH_VOICE_LEFT", "seat-voice");
    vi.stubEnv("FISH_VOICE_DEFAULT", "default-voice");
    expect(voiceId("left")).toBe("seat-voice");
    expect(voiceId("right")).toBe("default-voice");
  });
});

describe("providers", () => {
  it("prefers ElevenLabs and keeps Fish Audio as the fallback", () => {
    vi.stubEnv("ELEVEN_API_KEY", "x");
    vi.stubEnv("FISH_AUDIO_API_KEY", "y");
    expect(ttsProviders()).toEqual(["elevenlabs", "fish"]);
    vi.stubEnv("ELEVEN_API_KEY", "");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(ttsProviders()).toEqual(["fish"]);
  });

  it("gives every seat its own ElevenLabs voice and lets the environment override one", () => {
    for (const k of ["LEFT", "CENTER", "RIGHT", "STAFF", "DEFAULT"]) vi.stubEnv(`ELEVEN_VOICE_${k}`, "");
    const ids = (["left", "center", "right"] as const).map((v) => voiceId(v, "elevenlabs"));
    expect(new Set(ids).size).toBe(3);
    vi.stubEnv("ELEVEN_VOICE_CENTER", "chair-voice");
    expect(voiceId("center", "elevenlabs")).toBe("chair-voice");
    expect(voiceId("center", "fish")).not.toBe("chair-voice");
  });
});

describe("ElevenLabs library voices on a free plan", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the seat's default voice once, then skips the library voice", async () => {
    vi.stubEnv("ELEVEN_API_KEY", "x");
    vi.stubEnv("FISH_AUDIO_API_KEY", "");
    vi.stubEnv("ELEVEN_VOICE_CENTER", "");
    vi.stubEnv("ELEVEN_VOICE_DEFAULT", "");
    const library = voiceId("center", "elevenlabs");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return url.includes(library)
        ? new Response(JSON.stringify({ detail: { code: "paid_plan_required" } }), { status: 402 })
        : new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });
    const first = await synthesize("첫 질문입니다.", "center");
    expect(first.provider).toBe("elevenlabs");
    expect(first.audio.length).toBe(3);
    await synthesize("두 번째 질문입니다.", "center");
    expect(calls.filter((u) => u.includes(library))).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });
});
