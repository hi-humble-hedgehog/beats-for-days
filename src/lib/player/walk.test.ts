import { describe, expect, it } from "vitest";
import catalog from "../../../docs/beats-launch-pack/catalog.json" with { type: "json" };
import { getZeroRepeatWalkCandidates, simulateZeroRepeatWalk } from "./walk";
import type { BeatView } from "@/lib/types/beat";

const defaultTiming = {
  handleMs: 250,
  crossfadeMs: 100,
  glueMs: 7000,
  landMs: 0,
};

const trackA: BeatView = {
  id: "track-a",
  name: "Track A",
  audioUrl: "/audio/a.m4a",
  durationMs: 60000,
  loopStartMs: 0,
  loopEndMs: 60000,
  bpm: 90,
  transitions: [
    {
      id: "tr-a-b",
      targetTrackId: "track-b",
      audioUrl: "/audio/tr-a-b.m4a",
      timing: defaultTiming,
    },
  ],
};

const trackB: BeatView = {
  id: "track-b",
  name: "Track B",
  audioUrl: "/audio/b.m4a",
  durationMs: 60000,
  loopStartMs: 0,
  loopEndMs: 60000,
  bpm: 90,
  transitions: [
    {
      id: "tr-b-c",
      targetTrackId: "track-c",
      audioUrl: "/audio/tr-b-c.m4a",
      timing: defaultTiming,
    },
  ],
};

const trackC: BeatView = {
  id: "track-c",
  name: "Track C",
  audioUrl: "/audio/c.m4a",
  durationMs: 60000,
  loopStartMs: 0,
  loopEndMs: 60000,
  bpm: 90,
  transitions: [],
};

const launchTracks: BeatView[] = catalog.tracks.map((t) => ({
  id: t.id,
  name: t.name,
  audioUrl: `/audio/tracks/${t.fileName}`,
  durationMs: t.durationMs,
  loopStartMs: t.loopStartMs,
  loopEndMs: t.loopEndMs,
  bpm: t.bpm,
  transitions: catalog.transitions
    .filter((tr) => tr.from === t.id)
    .map((tr) => ({
      id: tr.id,
      targetTrackId: tr.to,
      audioUrl: `/audio/transitions/${tr.fileName}`,
      timing: tr.timing,
    })),
}));

describe("simulateZeroRepeatWalk", () => {
  it("walks linear transition graph to completion", () => {
    const lenA = simulateZeroRepeatWalk(trackA, [trackA, trackB, trackC]);
    const lenB = simulateZeroRepeatWalk(trackB, [trackA, trackB, trackC]);
    const lenC = simulateZeroRepeatWalk(trackC, [trackA, trackB, trackC]);

    expect(lenA).toBe(3);
    expect(lenB).toBe(2);
    expect(lenC).toBe(1);
  });
});

describe("getZeroRepeatWalkCandidates", () => {
  it("returns the track that can traverse the entire chain in a linear graph", () => {
    const candidates = getZeroRepeatWalkCandidates([trackA, trackB, trackC]);
    expect(candidates.map((c) => c.id)).toEqual(["track-a"]);
  });

  it("returns all tracks when all tracks are isolated or have equal walk length", () => {
    const isolatedA = { ...trackA, transitions: [] };
    const isolatedB = { ...trackB, transitions: [] };
    const candidates = getZeroRepeatWalkCandidates([isolatedA, isolatedB]);
    expect(candidates).toHaveLength(2);
  });

  it("strictly returns the 35-track zero-repeat continuous walk tracks from launch pack", () => {
    const candidates = getZeroRepeatWalkCandidates(launchTracks);

    // In launch catalog, exactly 9 tracks complete all 35 tracks greedily without repeats
    expect(candidates).toHaveLength(9);
    const candidateIds = candidates.map((c) => c.id);
    expect(candidateIds).toEqual([
      "track-01",
      "track-04",
      "track-09",
      "track-22",
      "track-24",
      "track-25",
      "track-27",
      "track-28",
      "track-29",
    ]);

    for (const candidate of candidates) {
      expect(simulateZeroRepeatWalk(candidate, launchTracks)).toBe(35);
    }
  });
});
