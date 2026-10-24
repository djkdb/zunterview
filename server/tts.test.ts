import { afterEach, describe, expect, it, vi } from "vitest";
import { audioType, resetTtsState, synthesize, ttsProviders, voiceId } from "./tts";

afterEach(() => {
  vi.unstubAllEnvs();
  resetTtsState();
});

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
    vi.stubEnv("TYPECAST_API_KEY", "t");
    vi.stubEnv("ELEVEN_API_KEY", "x");
    vi.stubEnv("FISH_AUDIO_API_KEY", "y");
    expect(ttsProviders()).toEqual(["typecast", "elevenlabs", "fish"]);
    vi.stubEnv("TYPECAST_API_KEY", "");
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
    vi.stubEnv("TYPECAST_API_KEY", "");
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

describe("Typecast", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is tried first, with the seat's Korean voice, and hands over to ElevenLabs when it fails", async () => {
    vi.stubEnv("TYPECAST_API_KEY", "t");
    vi.stubEnv("ELEVEN_API_KEY", "x");
    vi.stubEnv("TYPECAST_VOICE_RIGHT", "");
    vi.stubEnv("TYPECAST_VOICE_DEFAULT", "");
    const bodies: Record<string, unknown>[] = [];
    let typecastUp = true;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url.includes("typecast")) {
        bodies.push(JSON.parse(String(init.body)));
        return typecastUp ? new Response(new Uint8Array([7]), { status: 200 }) : new Response("no credit", { status: 402 });
      }
      return new Response(new Uint8Array([1, 2]), { status: 200 });
    });
    expect((await synthesize("원인은 어떻게 찾으셨나요?", "right")).provider).toBe("typecast");
    expect(bodies[0]).toMatchObject({ voice_id: voiceId("right", "typecast"), language: "kor", output: { audio_format: "mp3" } });
    typecastUp = false;
    expect((await synthesize("다음 질문입니다.", "right")).provider).toBe("elevenlabs");
  });
});

describe("a provider that refuses the account", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sits out instead of being asked before every line", async () => {
    vi.stubEnv("TYPECAST_API_KEY", "t");
    vi.stubEnv("ELEVEN_API_KEY", "x");
    vi.stubEnv("FISH_AUDIO_API_KEY", "");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url.includes("typecast") ? "typecast" : "eleven");
      return url.includes("typecast")
        ? new Response(JSON.stringify({ error_code: "UNUSUAL_ACTIVITY_DETECTED" }), { status: 403 })
        : new Response(new Uint8Array([1]), { status: 200 });
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const line of ["첫째 줄입니다.", "둘째 줄입니다.", "셋째 줄입니다."]) expect((await synthesize(line, "center")).provider).toBe("elevenlabs");
    expect(calls.filter((c) => c === "typecast")).toHaveLength(1);
  });
});

describe("VoxCPM (self-hosted)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("goes first when VOXCPM_URL is set and sends each seat's reference clip", async () => {
    vi.stubEnv("VOXCPM_URL", "http://gpu-box:8000/");
    vi.stubEnv("TYPECAST_API_KEY", "t");
    for (const k of ["ELEVEN_API_KEY", "ELEVENLABS_API_KEY", "FISH_AUDIO_API_KEY"]) vi.stubEnv(k, "");
    expect(ttsProviders()).toEqual(["voxcpm", "typecast"]);
    let seen: { url: string; body: Record<string, string> } | null = null;
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      seen = { url, body: JSON.parse(init.body) };
      return new Response(new Uint8Array([82, 73, 70, 70]), { status: 200 });
    });
    const out = await synthesize("그 결과 어떤 변화가 있었나요?", "center");
    expect(out.provider).toBe("voxcpm");
    expect(audioType(out.audio)).toBe("audio/wav");
    expect(seen!.url).toBe("http://gpu-box:8000/v1/audio/speech");
    expect(seen!.body).toMatchObject({ model: "openbmb/VoxCPM2", input: "그 결과 어떤 변화가 있었나요?", response_format: "wav" });
    expect(seen!.body.ref_audio).toMatch(/^data:audio\/wav;base64,UklGR/);
  });

  it("falls back to the next provider when the VoxCPM server is down", async () => {
    vi.stubEnv("VOXCPM_URL", "http://gpu-box:8000");
    vi.stubEnv("TYPECAST_API_KEY", "t");
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("gpu-box")) throw new Error("connect ECONNREFUSED");
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });
    expect((await synthesize("네, 알겠습니다.", "left")).provider).toBe("typecast");
  });

  it("uses Pixazo's hosted VoxCPM2 without a GPU server, cloning the seat's clip from a public URL", async () => {
    vi.stubEnv("VOXCPM_URL", "");
    vi.stubEnv("PIXAZO_API_KEY", "pk");
    for (const k of ["TYPECAST_API_KEY", "ELEVEN_API_KEY", "ELEVENLABS_API_KEY", "FISH_AUDIO_API_KEY"]) vi.stubEnv(k, "");
    expect(ttsProviders()).toEqual(["voxcpm"]);
    const calls: { url: string; headers?: Record<string, string>; body?: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, headers: init?.headers, body: init?.body ? JSON.parse(init.body) : undefined });
      if (url.includes("gateway.pixazo.ai")) return new Response(JSON.stringify({ status: "done", url: "https://cdn.example/out.wav" }), { status: 200 });
      return new Response(new Uint8Array([82, 73, 70, 70, 0]), { status: 200 });
    });
    const out = await synthesize("지원 동기를 말씀해 주세요.", "left");
    expect(audioType(out.audio)).toBe("audio/wav");
    expect(calls[0].url).toBe("https://gateway.pixazo.ai/voxcpm/v1/voice-cloning");
    expect(calls[0].headers?.["Ocp-Apim-Subscription-Key"]).toBe("pk");
    expect(calls[0].body).toMatchObject({ text: "지원 동기를 말씀해 주세요.", prompt_text: expect.stringContaining("편하게 답변해") });
    expect(calls[0].body?.reference_audio_url).toMatch(/\/server\/voices\/voxcpm\/left\.wav$/);
    expect(calls[1].url).toBe("https://cdn.example/out.wav");
  });
});
