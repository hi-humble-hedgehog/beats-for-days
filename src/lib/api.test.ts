import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi, waitlistApi } from "./api";
import { API_ROUTES } from "./constants";

describe("beatsApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getBeats fetches from /api/beats and returns data", async () => {
    const mockData = { beats: [], total: 0 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await beatsApi.getBeats();

    expect(globalThis.fetch).toHaveBeenCalledWith(API_ROUTES.BEATS);
    expect(result).toEqual(mockData);
  });

  it("getBeats throws error when response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    });

    await expect(beatsApi.getBeats()).rejects.toThrow(
      "Failed to load beats: Internal Server Error",
    );
  });

  it("getNextBeat sends POST request to /api/beats/next with payload", async () => {
    const mockResponse = {
      beat: {
        id: "0001",
        name: "Beat",
        audioUrl: "http://a.wav",
        transitions: [],
      },
      transition: null,
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const payload = {
      currentTrackId: "0001",
      playedTrackIds: ["0001"],
      mode: "auto" as const,
    };
    const result = await beatsApi.getNextBeat(payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(API_ROUTES.BEATS_NEXT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockResponse);
  });

  it("getNextBeat works with default empty payload", async () => {
    const mockResponse = {
      beat: {
        id: "0001",
        name: "Beat",
        audioUrl: "http://a.wav",
        transitions: [],
      },
      transition: null,
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await beatsApi.getNextBeat();

    expect(globalThis.fetch).toHaveBeenCalledWith(API_ROUTES.BEATS_NEXT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(result).toEqual(mockResponse);
  });

  it("getNextBeat throws error when response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    });

    await expect(beatsApi.getNextBeat()).rejects.toThrow(
      "Failed to resolve next beat: Not Found",
    );
  });
});

describe("waitlistApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getStats fetches from /api/waitlist", async () => {
    const mockStats = { total: 100, claimed: 40, remaining: 60 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });

    const result = await waitlistApi.getStats();

    expect(globalThis.fetch).toHaveBeenCalledWith(API_ROUTES.WAITLIST);
    expect(result).toEqual(mockStats);
  });

  it("getStats throws error when response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Gateway",
    });

    await expect(waitlistApi.getStats()).rejects.toThrow(
      "Failed to load waitlist metrics: Bad Gateway",
    );
  });

  it("joinWaitlist sends POST request to /api/waitlist", async () => {
    const mockResponse = { success: true, remaining: 59 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const payload = { email: "test@example.com", timezone: "Europe/Amsterdam" };
    const result = await waitlistApi.joinWaitlist(payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(API_ROUTES.WAITLIST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockResponse);
  });
});
