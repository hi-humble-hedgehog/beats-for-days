import { describe, expect, it, vi } from "vitest";
import { BoundedAudioCache } from "./cache";
import type { AudioBufferLike } from "./types";

describe("BoundedAudioCache", () => {
  const createMockBuffer = (duration: number): AudioBufferLike => ({
    duration,
    length: duration * 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
  });

  it("loads and caches buffers on first access", async () => {
    const loader = vi
      .fn()
      .mockImplementation((_url: string) =>
        Promise.resolve(createMockBuffer(60)),
      );
    const cache = new BoundedAudioCache({ capacity: 3, loader });

    const buffer1 = await cache.get("/audio/track-1.m4a");
    expect(buffer1.duration).toBe(60);
    expect(loader).toHaveBeenCalledTimes(1);

    // Second call should return cached buffer without calling loader
    const buffer2 = await cache.get("/audio/track-1.m4a");
    expect(buffer2).toBe(buffer1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("evicts the least recently used buffer when capacity is exceeded", async () => {
    const loader = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(createMockBuffer(Number(url.replace(/\D/g, "")) || 1)),
      );
    const cache = new BoundedAudioCache({ capacity: 2, loader });

    await cache.get("/audio/1");
    await cache.get("/audio/2");
    expect(cache.size).toBe(2);

    // Access 1 again so 2 becomes the least recently used
    await cache.get("/audio/1");

    // Load 3 -> should evict 2
    await cache.get("/audio/3");
    expect(cache.size).toBe(2);
    expect(cache.has("/audio/2")).toBe(false);
    expect(cache.has("/audio/1")).toBe(true);
    expect(cache.has("/audio/3")).toBe(true);
  });

  it("clears all cached entries", async () => {
    const loader = vi.fn().mockResolvedValue(createMockBuffer(10));
    const cache = new BoundedAudioCache({ capacity: 5, loader });

    await cache.get("/audio/1");
    await cache.get("/audio/2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has("/audio/1")).toBe(false);
  });
});
