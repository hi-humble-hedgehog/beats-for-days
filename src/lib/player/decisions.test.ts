import { describe, expect, it, vi } from "vitest";
import type { BeatView, TransitionView } from "@/lib/types/beat";
import {
  advancePlayedHistory,
  buildForwardResolution,
  historyAfterPrevious,
  planAdvance,
  resolveForwardBeatId,
  resolvePreviousAction,
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
      hasPausedBeat: false,
      notFoundBeatId: null,
      phase: "idle",
      secondsRemaining: 0,
      positionSec: 0,
      muted: false,
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

    const muted = playerReducer(initial, { type: "toggle_mute" });
    expect(muted.muted).toBe(true);
    expect(playerReducer(muted, { type: "toggle_mute" }).muted).toBe(false);
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

import { resolveStartBeat, shouldResolveStartOnPlay } from "./decisions";

describe("playerReducer notFound and hasPausedBeat", () => {
  it("tracks hasPausedBeat once playback starts and keeps it true after pausing", () => {
    const initial = createInitialPlayerUiState("/beat/0001");
    expect(initial.hasPausedBeat).toBe(false);
    expect(initial.notFoundBeatId).toBeNull();

    const stillStopped = playerReducer(initial, {
      type: "set_playing",
      isPlaying: false,
    });
    expect(stillStopped.hasPausedBeat).toBe(false);

    const playing = playerReducer(initial, {
      type: "set_playing",
      isPlaying: true,
    });
    expect(playing.hasPausedBeat).toBe(true);

    const paused = playerReducer(playing, {
      type: "set_playing",
      isPlaying: false,
    });
    expect(paused.isPlaying).toBe(false);
    expect(paused.hasPausedBeat).toBe(true);

    const toggledFromFresh = playerReducer(initial, { type: "toggle_playing" });
    expect(toggledFromFresh.isPlaying).toBe(true);
    expect(toggledFromFresh.hasPausedBeat).toBe(true);

    const toggledToPaused = playerReducer(toggledFromFresh, {
      type: "toggle_playing",
    });
    expect(toggledToPaused.isPlaying).toBe(false);
    expect(toggledToPaused.hasPausedBeat).toBe(true);
  });

  it("handles set_not_found by recording beatId and pausing when non-null", () => {
    const playing = playerReducer(createInitialPlayerUiState("/beat/0001"), {
      type: "set_playing",
      isPlaying: true,
    });

    const missing = playerReducer(playing, {
      type: "set_not_found",
      beatId: "9999",
    });
    expect(missing.notFoundBeatId).toBe("9999");
    expect(missing.isPlaying).toBe(false);

    const cleared = playerReducer(missing, {
      type: "set_not_found",
      beatId: null,
    });
    expect(cleared.notFoundBeatId).toBeNull();
  });

  it("preserves isPlaying when set_not_found clears beatId to null", () => {
    const playing = playerReducer(createInitialPlayerUiState("/beat/0001"), {
      type: "set_playing",
      isPlaying: true,
    });
    const cleared = playerReducer(playing, {
      type: "set_not_found",
      beatId: null,
    });
    expect(cleared.isPlaying).toBe(true);
  });
});

describe("resolveStartBeat", () => {
  it("resumes the paused beat without fetching when current is loaded and hasPausedBeat is true", async () => {
    const fetchNextBeat = vi.fn();
    const commitBeat = vi.fn();
    const startPlay = vi.fn();
    const navigate = vi.fn();

    const result = await resolveStartBeat({
      current: sampleBeat,
      hasPausedBeat: true,
      playedHistory: ["0001", "0002"],
      fetchNextBeat,
      commitBeat,
      startPlay,
      navigate,
    });

    expect(result).toEqual(sampleBeat);
    expect(fetchNextBeat).not.toHaveBeenCalled();
    expect(commitBeat).not.toHaveBeenCalled();
    expect(startPlay).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/beat/0002");
  });

  it("fetches next beat passing current.id when hasPausedBeat is false on a fresh session", async () => {
    const nextBeat: BeatView = {
      ...sampleBeat,
      id: "0003",
      name: "Soul Trumpet",
    };
    const fetchNextBeat = vi.fn().mockResolvedValue({ beat: nextBeat });
    const commitBeat = vi.fn();
    const startPlay = vi.fn();
    const navigate = vi.fn();

    const result = await resolveStartBeat({
      current: sampleBeat,
      hasPausedBeat: false,
      playedHistory: ["0001"],
      fetchNextBeat,
      commitBeat,
      startPlay,
      navigate,
    });

    expect(fetchNextBeat).toHaveBeenCalledWith({
      currentTrackId: "0002",
      playedTrackIds: ["0001"],
      mode: "skip",
    });
    expect(commitBeat).toHaveBeenCalledWith(nextBeat);
    expect(startPlay).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/beat/0003");
    expect(result).toEqual(nextBeat);
  });

  it("fetches next beat passing last playedHistory id when current is null", async () => {
    const fetchNextBeat = vi.fn().mockResolvedValue({ beat: sampleBeat });
    const startPlay = vi.fn();

    await resolveStartBeat({
      current: null,
      hasPausedBeat: false,
      playedHistory: ["0001", "0004"],
      fetchNextBeat,
      startPlay,
    });

    expect(fetchNextBeat).toHaveBeenCalledWith({
      currentTrackId: "0004",
      playedTrackIds: ["0001", "0004"],
      mode: "skip",
    });
  });

  it("fetches next beat with undefined currentTrackId when current is null and history is empty", async () => {
    const fetchNextBeat = vi.fn().mockResolvedValue({ beat: sampleBeat });
    const startPlay = vi.fn();

    await resolveStartBeat({
      current: null,
      playedHistory: [],
      fetchNextBeat,
      startPlay,
    });

    expect(fetchNextBeat).toHaveBeenCalledWith({
      currentTrackId: undefined,
      playedTrackIds: [],
      mode: "skip",
    });
  });
});

describe("historyAfterPrevious", () => {
  it("trims from the current id so the last remaining entry is the prior beat", () => {
    expect(historyAfterPrevious(["a", "b", "c"], "c")).toEqual(["a", "b"]);
    expect(historyAfterPrevious(["a", "b", "c"], "b")).toEqual(["a"]);
    expect(historyAfterPrevious(["a"], "a")).toEqual([]);
    expect(historyAfterPrevious(["a", "b"], "unrecorded")).toEqual(["a", "b"]);
    expect(historyAfterPrevious(["a", "b"], null)).toEqual(["a"]);
    expect(historyAfterPrevious(["a"], null)).toEqual([]);
    expect(historyAfterPrevious([], null)).toEqual([]);
  });
});

describe("resolveForwardBeatId", () => {
  it("returns the next beat ID in playedHistory when currentId sits before the tip", () => {
    const history = ["0001", "0002", "0003", "0004", "0005"];
    expect(resolveForwardBeatId(history, "0003")).toBe("0004");
    expect(resolveForwardBeatId(history, "0004")).toBe("0005");
  });

  it("returns null when currentId is at the tip, missing from history, or null", () => {
    const history = ["0001", "0002", "0003", "0004", "0005"];
    expect(resolveForwardBeatId(history, "0005")).toBeNull();
    expect(resolveForwardBeatId(history, "9999")).toBeNull();
    expect(resolveForwardBeatId(history, null)).toBeNull();
    expect(resolveForwardBeatId([], "0001")).toBeNull();
  });
});

describe("buildForwardResolution", () => {
  const otherTransition: TransitionView = {
    ...sampleTransition,
    id: "t-1-99",
    targetTrackId: "0099",
  };

  it("pairs the target beat with a matching transition from currentBeat when available", () => {
    const beatWithTransition: BeatView = {
      ...sampleBeat,
      id: "0001",
      transitions: [otherTransition, sampleTransition],
    };
    expect(buildForwardResolution(beatWithTransition, sampleBeat)).toEqual({
      beat: sampleBeat,
      transition: sampleTransition,
    });
  });

  it("returns transition: null when currentBeat has no matching transition to nextBeat", () => {
    const beatWithoutMatch: BeatView = {
      ...sampleBeat,
      id: "0001",
      transitions: [otherTransition],
    };
    expect(buildForwardResolution(beatWithoutMatch, sampleBeat)).toEqual({
      beat: sampleBeat,
      transition: null,
    });
  });
});

describe("advancePlayedHistory", () => {
  it("seeds an unrecorded currentId before appending nextBeatId", () => {
    expect(advancePlayedHistory([], "0001", "0002")).toEqual(["0001", "0002"]);
    expect(advancePlayedHistory(["0099"], "0001", "0002")).toEqual([
      "0099",
      "0001",
      "0002",
    ]);
  });

  it("preserves exact history order when stepping backward or forward through existing tracks", () => {
    const history = ["0001", "0002", "0003", "0004", "0005"];
    expect(advancePlayedHistory(history, "0005", "0004", true)).toEqual(
      history,
    );
    expect(advancePlayedHistory(history, "0004", "0003", true)).toEqual(
      history,
    );
    expect(advancePlayedHistory(history, "0003", "0004")).toEqual(history);
    expect(advancePlayedHistory(history, "0004", "0005")).toEqual(history);
  });

  it("appends a brand-new beat at the tip and moves a tip-recycled beat to the end", () => {
    const history = ["0001", "0002", "0003", "0004", "0005"];
    expect(advancePlayedHistory(history, "0005", "0006")).toEqual([
      "0001",
      "0002",
      "0003",
      "0004",
      "0005",
      "0006",
    ]);
    expect(advancePlayedHistory(history, "0005", "0001")).toEqual([
      "0002",
      "0003",
      "0004",
      "0005",
      "0001",
    ]);
  });
});

describe("resolvePreviousAction", () => {
  it("restarts when playback is past 3 seconds", () => {
    expect(
      resolvePreviousAction({
        positionSec: 3.01,
        playedHistory: ["0001", "0002"],
        currentId: "0002",
      }),
    ).toEqual({ kind: "seek_start" });
  });

  it("loads the previous history beat at or under 3 seconds", () => {
    expect(
      resolvePreviousAction({
        positionSec: 3,
        playedHistory: ["0001", "0002"],
        currentId: "0002",
      }),
    ).toEqual({ kind: "load_previous", beatId: "0001" });
    expect(
      resolvePreviousAction({
        positionSec: 0,
        playedHistory: ["0001", "0002"],
        currentId: "0002",
      }),
    ).toEqual({ kind: "load_previous", beatId: "0001" });
  });

  it("restarts when no earlier beat exists", () => {
    expect(
      resolvePreviousAction({
        positionSec: 0,
        playedHistory: ["0002"],
        currentId: "0002",
      }),
    ).toEqual({ kind: "seek_start" });
    expect(
      resolvePreviousAction({
        positionSec: 1,
        playedHistory: [],
        currentId: "0002",
      }),
    ).toEqual({ kind: "seek_start" });
  });
});

describe("shouldResolveStartOnPlay", () => {
  it("returns false when already playing", () => {
    expect(shouldResolveStartOnPlay(true, "/", null, null)).toBe(false);
    expect(
      shouldResolveStartOnPlay(true, "/beat/0002", sampleBeat, "0002"),
    ).toBe(false);
  });

  it("returns true when paused on home, on a 404 beat, or when current is null", () => {
    expect(shouldResolveStartOnPlay(false, "/", sampleBeat, null)).toBe(true);
    expect(
      shouldResolveStartOnPlay(false, "/beat/missing", sampleBeat, "missing"),
    ).toBe(true);
    expect(shouldResolveStartOnPlay(false, "/beat/0002", null, null)).toBe(
      true,
    );
  });

  it("returns false when paused on a valid beat route or background route with current loaded", () => {
    expect(
      shouldResolveStartOnPlay(false, "/beat/0002", sampleBeat, null),
    ).toBe(false);
    expect(shouldResolveStartOnPlay(false, "/about", sampleBeat, null)).toBe(
      false,
    );
  });
});
