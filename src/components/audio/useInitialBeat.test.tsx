import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import type { BeatView } from "@/lib/types/beat";
import {
  fetchInitialBeatData,
  useInitialBeat,
  type PlayerStateRef,
} from "./useInitialBeat";

vi.mock("@/lib/api", () => ({
  beatsApi: {
    getBeat: vi.fn(),
    getNextBeat: vi.fn(),
  },
}));

const sampleBeat: BeatView = {
  id: "track-04",
  name: "Smoky Flute",
  audioUrl: "/audio/4.m4a",
  durationMs: 60000,
  loopStartMs: 0,
  loopEndMs: 60000,
  bpm: 96,
  transitions: [],
};

describe("fetchInitialBeatData", () => {
  let mockStore: Record<string, string> = {};
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStore = {};
    const mockStorage: Storage = {
      length: 0,
      clear: () => {
        mockStore = {};
      },
      getItem: (key: string) => mockStore[key] ?? null,
      key: () => null,
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
    };
    globalThis.window = {
      localStorage: mockStorage,
    } as unknown as Window & typeof globalThis;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("fetches explicit initial beat ID when provided", async () => {
    vi.mocked(beatsApi.getBeat).mockResolvedValueOnce(sampleBeat);

    const result = await fetchInitialBeatData("track-04", undefined, []);

    expect(beatsApi.getBeat).toHaveBeenCalledWith("track-04");
    expect(result).toEqual({ beat: sampleBeat });
  });

  it("returns hydrated: true when initialBeatId matches currentId", async () => {
    const result = await fetchInitialBeatData("track-04", "track-04", []);

    expect(beatsApi.getBeat).not.toHaveBeenCalled();
    expect(result).toEqual({ hydrated: true });
  });

  it("uses stored initial beat from localStorage on page refresh (empty history)", async () => {
    mockStore[STORAGE_KEYS.INITIAL_BEAT] = "track-22";
    const storedBeat = { ...sampleBeat, id: "track-22" };
    vi.mocked(beatsApi.getBeat).mockResolvedValueOnce(storedBeat);

    const result = await fetchInitialBeatData(undefined, undefined, []);

    expect(beatsApi.getBeat).toHaveBeenCalledWith("track-22");
    expect(beatsApi.getNextBeat).not.toHaveBeenCalled();
    expect(result).toEqual({ beat: storedBeat });
  });

  it("calls getNextBeat when no initial beat is stored and history is empty", async () => {
    vi.mocked(beatsApi.getNextBeat).mockResolvedValueOnce({
      beat: sampleBeat,
      transition: null,
      resolveAfterSec: 30,
    });

    const result = await fetchInitialBeatData(undefined, undefined, []);

    expect(beatsApi.getNextBeat).toHaveBeenCalledWith({
      playedTrackIds: [],
      mode: "skip",
    });
    expect(result).toEqual({
      beat: sampleBeat,
      transition: null,
      resolveAfterSec: 30,
    });
  });
});

describe("useInitialBeat", () => {
  let mockStore: Record<string, string> = {};
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStore = {};
    const mockStorage: Storage = {
      length: 0,
      clear: () => {
        mockStore = {};
      },
      getItem: (key: string) => mockStore[key] ?? null,
      key: () => null,
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
    };
    globalThis.window = {
      localStorage: mockStorage,
    } as unknown as Window & typeof globalThis;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("persists assigned random beat into localStorage when resolved on cold start", async () => {
    vi.mocked(beatsApi.getNextBeat).mockResolvedValueOnce({
      beat: sampleBeat,
      transition: null,
      resolveAfterSec: 30,
    });

    const dispatch = vi.fn();
    const stateRef = {
      current: { current: null, pathname: "/", playedHistory: [] },
    } as { current: PlayerStateRef };

    const { result } = renderHook(() =>
      useInitialBeat([], undefined, dispatch, stateRef),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.current).toEqual(sampleBeat);
    expect(mockStore[STORAGE_KEYS.INITIAL_BEAT]).toBe("track-04");
  });
});
