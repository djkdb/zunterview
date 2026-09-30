import { afterEach, describe, expect, it, vi } from "vitest";
import { voiceId } from "./tts";

afterEach(() => vi.unstubAllEnvs());

describe("voiceId", () => {
  it("gives every seat a built-in voice, so a deployment only needs the API key", () => {
    for (const k of ["FISH_VOICE_LEFT", "FISH_VOICE_CENTER", "FISH_VOICE_RIGHT", "FISH_VOICE_STAFF", "FISH_VOICE_DEFAULT"]) vi.stubEnv(k, "");
    const ids = (["left", "center", "right", "staff"] as const).map(voiceId);
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
