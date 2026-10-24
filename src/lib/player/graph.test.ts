import { describe, expect, it } from "vitest";
import {
  resolveNextBeat,
  selectNextGraphTrack,
  updatePlayedTrackIds,
} from "./graph";
import type { BeatView } from "@/lib/types/beat";

describe("updatePlayedTrackIds", () => {
  it("appends newly played track to the end of the history", () => {
    const history = ["track-1", "track-2"];
    const updated = updatePlayedTrackIds(history, "track-3");
    expect(updated).toEqual(["track-1", "track-2", "track-3"]);
  });

  it("moves an already played track to the newest end", () => {
    const history = ["track-1", "track-2", "track-3"];
    const updated = updatePlayedTrackIds(history, "track-1");
    expect(updated).toEqual(["track-2", "track-3", "track-1"]);
  });
});

describe("selectNextGraphTrack", () => {
  const trackA: BeatView = {
    id: "0001",
    name: "Beat One",
    audioUrl: "http://storage/1.wav",
    transitions: [
      {
        id: "t-1-2",
        targetTrackId: "0002",
        audioUrl: "http://storage/t1-2.wav",
      },
      {
        id: "t-1-3",
        targetTrackId: "0003",
        audioUrl: "http://storage/t1-3.wav",
      },
    ],
  };

  const trackB: BeatView = {
    id: "0002",
    name: "Beat Two",
    audioUrl: "http://storage/2.wav",
    transitions: [],
  };

  const trackC: BeatView = {
    id: "0003",
    name: "Beat Three",
    audioUrl: "http://storage/3.wav",
    transitions: [],
  };

  const trackD: BeatView = {
    id: "0004",
    name: "Beat Four",
    audioUrl: "http://storage/4.wav",
    transitions: [],
  };

  const trackE: BeatView = {
    id: "0005",
    name: "Beat Five",
    audioUrl: "http://storage/5.wav",
    transitions: [],
  };

  it("selects an unheard exit when available", () => {
    // track-2 is heard, track-3 is unheard
    const played = ["0001", "0002"];
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackD],
      inDegreeMap: { "0002": 1, "0003": 1, "0004": 0 },
    });

    expect(nextId).toBe("0003");
  });

  it("selects candidate with lowest in_degree if below cap and exits are exhausted", () => {
    // Both track-2 and track-3 are heard; track-5 (inDegree 2) comes BEFORE track-4 (inDegree 1) in allTracks
    // Heard track-2 and track-3 have inDegree 0 to verify they are filtered out despite lower inDegree
    const played = ["0002", "0003", "0001"];
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackE, trackD],
      inDegreeMap: { "0002": 0, "0003": 0, "0004": 1, "0005": 2 },
      maxDegreeCap: 8,
    });

    expect(nextId).toBe("0004");
  });

  it("excludes candidates whose in_degree equals or exceeds cap", () => {
    // Both exits heard; cap is 4; trackA has 2 transitions so 2 < 4 enters Step 2.
    // track-4 has inDegree 4 (at cap, excluded), track-5 has 5 (exceeds cap, excluded).
    const played = ["0003", "0002", "0001"];
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackD, trackE],
      inDegreeMap: { "0002": 1, "0003": 1, "0004": 4, "0005": 5 },
      maxDegreeCap: 4,
    });

    // Falls back to Step 3 oldest heard exit (0003 was played before 0002)
    expect(nextId).toBe("0003");
  });

  it("falls back to the oldest heard target in playedTrackIds when at cap", () => {
    // Both exits heard, cap is 2 (trackA has 2 transitions)
    const played = ["0002", "0003", "0001"]; // 0002 was played longer ago than 0003
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackD],
      inDegreeMap: { "0002": 1, "0003": 1, "0004": 0 },
      maxDegreeCap: 2, // At cap!
    });

    expect(nextId).toBe("0002");
  });

  it("falls back to the second exit when it was played earlier than the first exit", () => {
    // 0003 played earlier than 0002
    const played = ["0003", "0002", "0001"];
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackD],
      maxDegreeCap: 2,
    });

    expect(nextId).toBe("0003");
  });

  it("selects an unheard exit over an already heard exit", () => {
    // 0003 is heard, 0002 is unheard -> Step 1 picks unheard exit 0002
    const played = ["0003"];
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC, trackD],
      maxDegreeCap: 2,
    });

    expect(nextId).toBe("0002");
  });

  it("defaults to first transition target when no targets appear in playedTrackIds", () => {
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: [],
      allTracks: [trackA, trackB, trackC],
      maxDegreeCap: 2,
      pickRandom: () => 0,
    });

    expect(nextId).toBe("0002");
  });

  it("falls back to another track when track has no transitions and all tracks are heard", () => {
    const nextId = selectNextGraphTrack({
      currentTrack: trackB,
      playedTrackIds: ["0002", "0001"],
      allTracks: [trackB, trackA], // trackB is placed first to catch find(() => true) mutants
      maxDegreeCap: 0,
    });

    expect(nextId).toBe("0001");
  });

  it("falls back to currentTrack id when track has no transitions and no other tracks exist", () => {
    const nextId = selectNextGraphTrack({
      currentTrack: trackB,
      playedTrackIds: ["0002"],
      allTracks: [trackB],
      maxDegreeCap: 0,
    });

    expect(nextId).toBe("0002");
  });

  it("excludes current track from candidate search even when current track is unheard", () => {
    const nextId = selectNextGraphTrack({
      currentTrack: trackB, // trackB has 0 transitions, id "0002"
      playedTrackIds: [],
      allTracks: [trackB, trackA], // trackB first with lower in-degree
      inDegreeMap: { "0001": 2, "0002": 0 },
      maxDegreeCap: 5,
    });

    expect(nextId).toBe("0001");
  });
});

describe("resolveNextBeat", () => {
  const trackA: BeatView = {
    id: "0001",
    name: "Beat One",
    audioUrl: "http://storage/1.wav",
    transitions: [
      {
        id: "t-1-2",
        targetTrackId: "0002",
        audioUrl: "http://storage/t1-2.wav",
      },
      {
        id: "t-1-3",
        targetTrackId: "0003",
        audioUrl: "http://storage/t1-3.wav",
      },
    ],
  };

  const trackB: BeatView = {
    id: "0002",
    name: "Beat Two",
    audioUrl: "http://storage/2.wav",
    transitions: [],
  };

  const trackC: BeatView = {
    id: "0003",
    name: "Beat Three",
    audioUrl: "http://storage/3.wav",
    transitions: [],
  };

  it("returns initial track with null transition when no currentTrackId is given", () => {
    const result = resolveNextBeat({
      playedTrackIds: [],
      allTracks: [trackA, trackB, trackC],
      pickRandom: () => 0,
    });

    expect(result).not.toBeNull();
    expect(result?.beat.id).toBe("0001");
    expect(result?.transition).toBeNull();
  });

  it("resolves next track with matching transition in auto mode", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: ["0001", "0002"], // 0002 heard, 0003 unheard
      allTracks: [trackA, trackB, trackC],
      mode: "auto",
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0003");
    expect(result?.transition?.id).toBe("t-1-3");
    expect(result?.transition?.audioUrl).toBe("http://storage/t1-3.wav");
  });

  it("defaults to auto mode when mode parameter is omitted", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: ["0001", "0002"],
      allTracks: [trackA, trackB, trackC],
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0003");
    expect(result?.transition?.id).toBe("t-1-3");
  });

  it("resolves next unheard track with null transition in skip mode", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: ["0001"],
      allTracks: [trackA, trackB, trackC],
      mode: "skip",
      pickRandom: () => 0,
    });

    // Skips do not play AI transitions ($0 API cost per ADR 0009)
    expect(result?.beat.id).toBe("0002");
    expect(result?.transition).toBeNull();
  });

  it("avoids selecting currentTrackId in skip mode when currentTrackId is unheard", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: [], // 0001 is unheard
      allTracks: [trackA, trackB, trackC],
      mode: "skip",
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0002");
    expect(result?.transition).toBeNull();
  });

  it("returns null when allTracks is empty", () => {
    const result = resolveNextBeat({
      playedTrackIds: [],
      allTracks: [],
    });

    expect(result).toBeNull();
  });

  it("handles unknown currentTrackId by selecting an unheard candidate", () => {
    const result = resolveNextBeat({
      currentTrackId: "non-existent-id",
      playedTrackIds: ["0001"],
      allTracks: [trackA, trackB, trackC],
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0002");
    expect(result?.transition).toBeNull();
  });

  it("falls back to first track when all tracks are heard in skip mode", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: ["0001", "0002", "0003"],
      allTracks: [trackA, trackB, trackC],
      mode: "skip",
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0002");
  });

  it("handles single-track catalog in skip mode fallback", () => {
    const result = resolveNextBeat({
      currentTrackId: "0001",
      playedTrackIds: ["0001"],
      allTracks: [trackA],
      mode: "skip",
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0001");
    expect(result?.transition).toBeNull();
  });

  it("selects among equal possibilities using pickRandom", () => {
    // Both track-2 and track-3 are unheard exits from trackA
    const played = ["0001"];
    // With pickRandom returning index 1, it should select track-3 instead of defaulting to track-2
    const nextId = selectNextGraphTrack({
      currentTrack: trackA,
      playedTrackIds: played,
      allTracks: [trackA, trackB, trackC],
      pickRandom: () => 1,
    });

    expect(nextId).toBe("0003");
  });

  it("selects next track when transitions array is empty", () => {
    const result = resolveNextBeat({
      currentTrackId: "0002", // trackB has no transitions
      playedTrackIds: ["0002"],
      allTracks: [trackA, trackB, trackC],
      mode: "auto",
      pickRandom: () => 0,
    });

    expect(result?.beat.id).toBe("0001");
    expect(result?.transition).toBeNull();
  });
});
