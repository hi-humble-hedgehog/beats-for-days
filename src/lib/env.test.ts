import { afterEach, describe, expect, it, vi } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("defaults ALLOW_LIVE_AI_CALLS to false and allows omitting ELEVENLABS_API_KEY in offline mode", () => {
    expect(parseServerEnv({ OTHER: "ignored" })).toEqual({
      ALLOW_LIVE_AI_CALLS: false,
      ELEVENLABS_API_KEY: undefined,
      SUPABASE_URL: "http://127.0.0.1:54521",
      SUPABASE_ANON_KEY: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
      USE_LOCAL_AUDIO: true,
      AUTO_TRANSITION_RESOLVE_SECONDS: 30,
      DEBUG_PANEL: false,
    });
  });

  it("turns DEBUG_PANEL on only for the exact string true", () => {
    expect(parseServerEnv({ DEBUG_PANEL: "true" }).DEBUG_PANEL).toBe(true);
    expect(parseServerEnv({ DEBUG_PANEL: "false" }).DEBUG_PANEL).toBe(false);
    expect(() => parseServerEnv({ DEBUG_PANEL: "yes" })).toThrow("DEBUG_PANEL");
  });

  it("parses custom USE_LOCAL_AUDIO and AUTO_TRANSITION_RESOLVE_SECONDS", () => {
    expect(
      parseServerEnv({
        USE_LOCAL_AUDIO: "false",
        AUTO_TRANSITION_RESOLVE_SECONDS: "45",
      }),
    ).toMatchObject({
      USE_LOCAL_AUDIO: false,
      AUTO_TRANSITION_RESOLVE_SECONDS: 45,
    });
  });

  it("defaults USE_LOCAL_AUDIO to false in production and honors explicit true override", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "production",
      }),
    ).toMatchObject({
      USE_LOCAL_AUDIO: false,
    });

    expect(
      parseServerEnv({
        NODE_ENV: "production",
        USE_LOCAL_AUDIO: "true",
      }),
    ).toMatchObject({
      USE_LOCAL_AUDIO: true,
    });
  });

  it("rejects non-positive AUTO_TRANSITION_RESOLVE_SECONDS", () => {
    expect(() =>
      parseServerEnv({ AUTO_TRANSITION_RESOLVE_SECONDS: "-5" }),
    ).toThrow(/AUTO_TRANSITION_RESOLVE_SECONDS/);
    expect(() =>
      parseServerEnv({ AUTO_TRANSITION_RESOLVE_SECONDS: "0" }),
    ).toThrow(/AUTO_TRANSITION_RESOLVE_SECONDS/);
    expect(() =>
      parseServerEnv({ AUTO_TRANSITION_RESOLVE_SECONDS: "abc" }),
    ).toThrow(/AUTO_TRANSITION_RESOLVE_SECONDS/);
  });

  it("normalizes blank ELEVENLABS_API_KEY to undefined when ALLOW_LIVE_AI_CALLS is false", () => {
    expect(
      parseServerEnv({
        ALLOW_LIVE_AI_CALLS: "false",
        ELEVENLABS_API_KEY: "   ",
      }),
    ).toEqual({
      ALLOW_LIVE_AI_CALLS: false,
      ELEVENLABS_API_KEY: undefined,
      SUPABASE_URL: "http://127.0.0.1:54521",
      SUPABASE_ANON_KEY: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
      USE_LOCAL_AUDIO: true,
      AUTO_TRANSITION_RESOLVE_SECONDS: 30,
      DEBUG_PANEL: false,
    });
  });

  it("returns trimmed ELEVENLABS_API_KEY and parses ALLOW_LIVE_AI_CALLS=true", () => {
    expect(
      parseServerEnv({
        ALLOW_LIVE_AI_CALLS: "true",
        ELEVENLABS_API_KEY: " sk_123 ",
        OTHER: "x",
      }),
    ).toEqual({
      ALLOW_LIVE_AI_CALLS: true,
      ELEVENLABS_API_KEY: "sk_123",
      SUPABASE_URL: "http://127.0.0.1:54521",
      SUPABASE_ANON_KEY: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
      USE_LOCAL_AUDIO: true,
      AUTO_TRANSITION_RESOLVE_SECONDS: 30,
      DEBUG_PANEL: false,
    });
  });

  it("rejects invalid ALLOW_LIVE_AI_CALLS values", () => {
    expect(() => parseServerEnv({ ALLOW_LIVE_AI_CALLS: "yes" })).toThrow(
      /ALLOW_LIVE_AI_CALLS/,
    );
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
  ])(
    "rejects a %s ELEVENLABS_API_KEY when ALLOW_LIVE_AI_CALLS=true",
    (_label, value) => {
      expect(() =>
        parseServerEnv({
          ALLOW_LIVE_AI_CALLS: "true",
          ELEVENLABS_API_KEY: value,
        }),
      ).toThrow(
        "Invalid server environment:\n✖ is required when ALLOW_LIVE_AI_CALLS=true\n  → at ELEVENLABS_API_KEY",
      );
    },
  );
});

describe("getServerEnv", () => {
  // getServerEnv caches at module level, so each test loads a fresh module.
  const loadFresh = async () => {
    vi.resetModules();
    return import("./env");
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads process.env once and caches the result", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "first");
    const { getServerEnv } = await loadFresh();
    expect(getServerEnv().ELEVENLABS_API_KEY).toBe("first");

    vi.stubEnv("ELEVENLABS_API_KEY", "second");
    expect(getServerEnv().ELEVENLABS_API_KEY).toBe("first");
  });

  it("throws when live AI calls are enabled without an API key", async () => {
    vi.stubEnv("ALLOW_LIVE_AI_CALLS", "true");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const { getServerEnv } = await loadFresh();
    expect(() => getServerEnv()).toThrow(/ELEVENLABS_API_KEY/);
  });
});
