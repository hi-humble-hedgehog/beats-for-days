import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminTrackRecord } from "@/lib/admin";
import { useTrackAudition } from "./useTrackAudition";

describe("useTrackAudition", () => {
  const sampleTrack: AdminTrackRecord = {
    id: "track-01",
    name: "01",
    index: 1,
    bpm: 90,
    key: "C minor",
    genre: "Boom Bap",
    duration_ms: 60000,
    loop_start_ms: 5000,
    loop_end_ms: 55000,
    loop_duration_ms: 50000,
    audio_path: "tracks/track-01.m4a",
    audio_url: "/audio/tracks/track-01.m4a",
    is_active: true,
  };

  const mockTransitions = {
    outTransitions: [
      {
        id: "tr-1-9",
        from_track_id: "track-01",
        to_track_id: "track-09",
        from_label: "01",
        to_label: "09",
        audio_path: "transitions/track-01-to-track-09.m4a",
        audio_url: "/audio/transitions/track-01-to-track-09.m4a",
        timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
      },
    ],
    inTransitions: [
      {
        id: "tr-3-1",
        from_track_id: "track-03",
        to_track_id: "track-01",
        from_label: "03",
        to_label: "01",
        audio_path: "transitions/track-03-to-track-01.m4a",
        audio_url: "/audio/transitions/track-03-to-track-01.m4a",
        timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
      },
    ],
  };

  let mockAudio: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    src: string;
    currentTime: number;
    duration: number;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      src: "",
      currentTime: 0,
      duration: 60,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal(
      "Audio",
      vi.fn(function MockAudio() {
        return mockAudio;
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTransitions),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches transitions for the track on mount", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    // Wait for fetch effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/tracks/track-01/transitions",
    );
    expect(result.current.outTransitions).toHaveLength(1);
    expect(result.current.inTransitions).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("toggles play and pause for the main beat", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    await act(async () => {
      result.current.playBeat();
    });

    expect(mockAudio.src).toContain("/audio/tracks/track-01.m4a");
    expect(mockAudio.play).toHaveBeenCalled();
    expect(result.current.activeClipId).toBe("beat");

    await act(async () => {
      result.current.playBeat();
    });

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it("plays a transition and pauses the current beat", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.playBeat();
    });

    expect(result.current.activeClipId).toBe("beat");

    const transition = mockTransitions.outTransitions[0];
    if (!transition) throw new Error("Expected transition");

    await act(async () => {
      result.current.playTransition(transition);
    });

    expect(mockAudio.src).toContain(transition.audio_url);
    expect(result.current.activeClipId).toBe(transition.id);
  });

  it("jumps to 8 seconds before loop exit", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    await act(async () => {
      result.current.jumpBeforeExit(8);
    });

    // loop_end_ms is 55000 -> 55s. 55 - 8 = 47s
    expect(result.current.currentTime).toBe(47);
  });

  it("toggles audition mode between blend and bridge", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    expect(result.current.auditionMode).toBe("blend");

    act(() => {
      result.current.setAuditionMode("bridge");
    });
    expect(result.current.auditionMode).toBe("bridge");

    act(() => {
      result.current.setAuditionMode("blend");
    });
    expect(result.current.auditionMode).toBe("blend");
  });

  it("updates autoMix setting", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    expect(result.current.autoMix).toBe("off");

    act(() => {
      result.current.setAutoMix(2);
    });
    expect(result.current.autoMix).toBe(2);
  });

  it("supports testTransition in bridge mode", async () => {
    const { result } = renderHook(() => useTrackAudition(sampleTrack));

    await act(async () => {
      await Promise.resolve();
    });

    const transition = mockTransitions.outTransitions[0];
    if (!transition) throw new Error("Expected transition");

    await act(async () => {
      result.current.testTransition(transition, "bridge");
    });

    expect(mockAudio.src).toContain(transition.audio_url);
    expect(result.current.activeClipId).toBe(transition.id);
  });

  it("stops playback when unmounted after playing", async () => {
    const { result, unmount } = renderHook(() => useTrackAudition(sampleTrack));

    await act(async () => {
      result.current.playBeat();
    });

    unmount();
    expect(mockAudio.pause).toHaveBeenCalled();
  });
});
