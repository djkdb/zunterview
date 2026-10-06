import { afterEach, describe, expect, it, vi } from "vitest";
import { ttsProviders, voiceId } from "./tts";

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
