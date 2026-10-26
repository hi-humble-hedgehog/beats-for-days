import { describe, expect, it } from "vitest";
import type { BeatView, TransitionView } from "@/lib/types/beat";
import {
  planAdvance,
  resolveRouteIntent,
  selectBeatDisplayInfo,
} from "./decisions";

const sampleBeat: BeatView = {
  id: "0002",
  name: "Jazz Flute",
  audioUrl: "/audio/2.m4a",
  durationMs: 60000,
  loopStartMs: 10000,
  loopEndMs: 50000,
  bpm: 86,
  transitions: [],
};

const sampleTransition: TransitionView = {
  id: "t-1-2",
  targetTrackId: "0002",
  audioUrl: "/audio/t.m4a",
  timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
};

describe("resolveRouteIntent", () => {
  it("returns pause on the root landing route", () => {
    expect(resolveRouteIntent("/", "0001")).toEqual({ kind: "pause" });
    expect(resolveRouteIntent("/", null)).toEqual({ kind: "pause" });
  });

  it("returns load when beat route slug differs from current beat id", () => {
    expect(resolveRouteIntent("/beat/0002", "0001")).toEqual({
      kind: "load",
      beatId: "0002",
    });
    expect(resolveRouteIntent("/beat/0002", null)).toEqual({
      kind: "load",
      beatId: "0002",
    });
  });

  it("returns none when beat route slug already matches current beat id", () => {
    expect(resolveRouteIntent("/beat/0002", "0002")).toEqual({
      kind: "none",
    });
  });

  it("returns background on informational routes", () => {
    expect(resolveRouteIntent("/about", "0001")).toEqual({
      kind: "background",
    });
    expect(resolveRouteIntent("/generate", null)).toEqual({
      kind: "background",
    });
  });
});

describe("planAdvance", () => {
  it("arms transition on auto advance when a transition bridge exists", () => {
    expect(
      planAdvance(
        "auto",
        { beat: sampleBeat, transition: sampleTransition },
        true,
      ),
    ).toEqual({
      kind: "arm",
      beat: sampleBeat,
      transition: sampleTransition,
    });
  });

  it("falls back to skip on auto advance when transition is null and player is playing", () => {
    expect(
      planAdvance("auto", { beat: sampleBeat, transition: null }, true),
    ).toEqual({
      kind: "skip",
      beat: sampleBeat,
    });
  });

  it("falls back to commit on auto advance when transition is null and player is paused", () => {
    expect(
      planAdvance("auto", { beat: sampleBeat, transition: null }, false),
    ).toEqual({
      kind: "commit",
      beat: sampleBeat,
    });
  });

  it("skips immediately on manual skip when player is playing even if transition is present", () => {
    expect(
      planAdvance(
        "skip",
        { beat: sampleBeat, transition: sampleTransition },
        true,
      ),
    ).toEqual({
      kind: "skip",
      beat: sampleBeat,
    });
  });

  it("commits without starting playback on manual skip when player is paused", () => {
    expect(
      planAdvance(
        "skip",
        { beat: sampleBeat, transition: sampleTransition },
        false,
      ),
    ).toEqual({
      kind: "commit",
      beat: sampleBeat,
    });
  });
});

describe("selectBeatDisplayInfo", () => {
  it("returns the current beat name and id when slug matches current beat", () => {
    expect(
      selectBeatDisplayInfo({
        slug: "0002",
        current: sampleBeat,
      }),
    ).toEqual({
      slug: "0002",
      beatName: "Jazz Flute",
      trackId: "0002",
    });
  });

  it("uses current beat when slug is the fallback dash", () => {
    expect(
      selectBeatDisplayInfo({
        slug: "—",
        current: sampleBeat,
      }),
    ).toEqual({
      slug: "—",
      beatName: "Jazz Flute",
      trackId: "0002",
    });
  });

  it("returns undefined beatName and fallback dash when both slug and current are absent", () => {
    expect(
      selectBeatDisplayInfo({
        slug: "—",
        current: null,
      }),
    ).toEqual({
      slug: "—",
      beatName: undefined,
      trackId: "—",
    });
  });

  it("shows loading state for target slug when current beat has not caught up", () => {
    expect(
      selectBeatDisplayInfo({
        slug: "0003",
        current: sampleBeat,
      }),
    ).toEqual({
      slug: "0003",
      beatName: undefined,
      trackId: "0003",
    });
  });
});

import { createInitialPlayerUiState, playerReducer } from "./decisions";

describe("playerReducer", () => {
  it("creates initial UI state for a given pathname", () => {
    expect(createInitialPlayerUiState("/beat/0001")).toEqual({
      activePathname: "/beat/0001",
      isPlaying: false,
      phase: "idle",
      secondsRemaining: 0,
      positionSec: 0,
      error: null,
    });
  });

  it("handles set_playing and toggle_playing actions", () => {
    const initial = createInitialPlayerUiState("/beat/0001");
    expect(
      playerReducer(initial, { type: "set_playing", isPlaying: false })
        .isPlaying,
    ).toBe(false);
    const playing = playerReducer(initial, {
      type: "set_playing",
      isPlaying: true,
    });
    expect(playing.isPlaying).toBe(true);
    expect(
      playerReducer(playing, { type: "set_playing", isPlaying: true })
        .isPlaying,
    ).toBe(true);

    const toggled = playerReducer(playing, { type: "toggle_playing" });
    expect(toggled.isPlaying).toBe(false);

    const toggledAgain = playerReducer(toggled, { type: "toggle_playing" });
    expect(toggledAgain.isPlaying).toBe(true);
  });

  it("handles sync_snapshot action", () => {
    const initial = createInitialPlayerUiState("/beat/0001");
    const synced = playerReducer(initial, {
      type: "sync_snapshot",
      phase: "playing",
      secondsRemaining: 42,
      positionSec: 18,
    });
    expect(synced.phase).toBe("playing");
    expect(synced.secondsRemaining).toBe(42);
    expect(synced.positionSec).toBe(18);
  });

  it("handles set_pathname and set_error actions", () => {
    const initial = createInitialPlayerUiState("/beat/0001");
    const moved = playerReducer(initial, {
      type: "set_pathname",
      pathname: "/beat/0002",
    });
    expect(moved.activePathname).toBe("/beat/0002");

    const errored = playerReducer(moved, {
      type: "set_error",
      error: "Network error",
    });
    expect(errored.error).toBe("Network error");
  });
});
