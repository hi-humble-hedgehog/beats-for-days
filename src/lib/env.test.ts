import { afterEach, describe, expect, it, vi } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("returns only the validated variables, trimmed", () => {
    expect(
      parseServerEnv({ ELEVENLABS_API_KEY: " sk_123 ", OTHER: "x" }),
    ).toEqual({ ELEVENLABS_API_KEY: "sk_123" });
  });

  it("rejects a missing ELEVENLABS_API_KEY", () => {
    expect(() => parseServerEnv({})).toThrow(
      /^Invalid server environment:\n.*\n.*ELEVENLABS_API_KEY/,
    );
  });

  it.each([
    ["empty", ""],
    ["blank", "   "],
  ])("rejects an %s ELEVENLABS_API_KEY as required", (_label, value) => {
    expect(() => parseServerEnv({ ELEVENLABS_API_KEY: value })).toThrow(
      "Invalid server environment:\n✖ is required\n  → at ELEVENLABS_API_KEY",
    );
  });
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

  it("throws when the environment is invalid", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const { getServerEnv } = await loadFresh();
    expect(() => getServerEnv()).toThrow(/ELEVENLABS_API_KEY/);
  });
});
