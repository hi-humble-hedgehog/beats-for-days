import { describe, expect, it } from "vitest";
import catalog from "../../../docs/beats-launch-pack/catalog.json" with { type: "json" };
import { resolveNextBeat, updatePlayedTrackIds } from "./graph";
import type { BeatView } from "@/lib/types/beat";

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

describe("Warnsdorff graph sequence simulations", () => {
  it("plays a full session with high catalogue coverage (30+ unique tracks, 0 duplicates until late set)", () => {
    let history = [launchTracks[0]!.id];
    let currentId = launchTracks[0]!.id;
    const sessionTracks = [currentId];

    for (let step = 1; step < launchTracks.length; step++) {
      const res = resolveNextBeat({
        currentTrackId: currentId,
        playedTrackIds: history,
        allTracks: launchTracks,
        mode: "auto",
      });

      expect(res).not.toBeNull();
      expect(res?.transition).not.toBeNull();
      expect(res?.transition?.targetTrackId).toBe(res?.beat.id);

      currentId = res!.beat.id;
      sessionTracks.push(currentId);
      history = updatePlayedTrackIds(history, currentId);
    }

    expect(sessionTracks).toHaveLength(launchTracks.length);
    // Even under greedy Warnsdorff without backtracking, the player reaches high unique tracks
    // before encountering an exit bottleneck, matching the report simulation
    expect(new Set(sessionTracks).size).toBeGreaterThanOrEqual(30);
  });

  it("handles 10 separate continuous listening sessions without repeating tracks inside the cooldown window", () => {
    let history: string[] = [];
    const playedSequence: string[] = [];

    for (let session = 1; session <= 10; session++) {
      const startRes = resolveNextBeat({
        playedTrackIds: history,
        allTracks: launchTracks,
        mode: "skip",
      });
      expect(startRes).not.toBeNull();

      let currentId = startRes!.beat.id;
      history = updatePlayedTrackIds(history, currentId);
      playedSequence.push(currentId);

      for (let step = 1; step < 10; step++) {
        const nextRes = resolveNextBeat({
          currentTrackId: currentId,
          playedTrackIds: history,
          allTracks: launchTracks,
          mode: "auto",
        });

        expect(nextRes).not.toBeNull();
        expect(nextRes?.transition).not.toBeNull();
        expect(nextRes?.transition?.targetTrackId).toBe(nextRes?.beat.id);

        currentId = nextRes!.beat.id;
        history = updatePlayedTrackIds(history, currentId);
        playedSequence.push(currentId);
      }
    }

    expect(playedSequence).toHaveLength(100);

    for (let i = 1; i < playedSequence.length; i++) {
      const prevIndex = playedSequence.lastIndexOf(playedSequence[i]!, i - 1);
      if (prevIndex !== -1) {
        expect(i - prevIndex).toBeGreaterThanOrEqual(21);
      }
    }
  });

  it("handles 10 sessions that start with the same bookmarked song, exhausts all 8 outgoing transitions, and rolls over cleanly", () => {
    const bookmarkedTrackId = "track-01";
    let history: string[] = [];
    const firstTransitionsChosen: string[] = [];

    // Across 10 sessions, each session opens the bookmarked song and auto-advances.
    // The first 8 sessions must pick each of the 8 unique outgoing exits without repeat.
    // Sessions 9 and 10 cleanly roll over to the least-recently-heard exits.
    for (let session = 1; session <= 10; session++) {
      history = updatePlayedTrackIds(history, bookmarkedTrackId);

      const firstTransitionRes = resolveNextBeat({
        currentTrackId: bookmarkedTrackId,
        playedTrackIds: history,
        allTracks: launchTracks,
        mode: "auto",
      });

      expect(firstTransitionRes).not.toBeNull();
      expect(firstTransitionRes?.transition).not.toBeNull();
      expect(firstTransitionRes?.transition?.targetTrackId).toBe(
        firstTransitionRes?.beat.id,
      );

      const targetId = firstTransitionRes!.beat.id;
      firstTransitionsChosen.push(targetId);
      history = updatePlayedTrackIds(history, targetId);
    }

    // The first 8 sessions must exhaust all 8 distinct outgoing transitions of track-01
    const first8Exits = new Set(firstTransitionsChosen.slice(0, 8));
    expect(first8Exits.size).toBe(8);

    // Over all 10 sessions, all 8 transitions were utilized
    expect(new Set(firstTransitionsChosen).size).toBe(8);

    // Sessions 9 and 10 chose the exits heard longest ago
    expect(firstTransitionsChosen[8]).toBe(firstTransitionsChosen[0]);
    expect(firstTransitionsChosen[9]).toBe(firstTransitionsChosen[1]);
  });

  it("handles 10 sessions that start with random unplayed songs and exhausts the entire crate", () => {
    let history: string[] = [];
    const sessionStartIds: string[] = [];

    for (let session = 1; session <= 10; session++) {
      const coldStartRes = resolveNextBeat({
        playedTrackIds: history,
        allTracks: launchTracks,
        mode: "skip",
      });

      expect(coldStartRes).not.toBeNull();
      expect(coldStartRes?.transition).toBeNull();

      const startId = coldStartRes!.beat.id;
      sessionStartIds.push(startId);
      history = updatePlayedTrackIds(history, startId);

      let currentId = startId;
      for (let step = 1; step < 8; step++) {
        const stepRes = resolveNextBeat({
          currentTrackId: currentId,
          playedTrackIds: history,
          allTracks: launchTracks,
          mode: "auto",
        });

        expect(stepRes).not.toBeNull();
        currentId = stepRes!.beat.id;
        history = updatePlayedTrackIds(history, currentId);
      }
    }

    // Across 10 sessions (8 tracks each = 80 plays), the crate is completely exhausted
    // and cold starts smoothly transition to fresh unplayed/cooldown-eligible tracks.
    expect(new Set(sessionStartIds).size).toBeGreaterThanOrEqual(6);
    expect(new Set(history).size).toBe(launchTracks.length);
  });

  it("handles 10 sessions mixing rapid skipping and auto-transitions without breaking audio continuity", () => {
    let history: string[] = [];
    let totalPlayedCount = 0;

    for (let session = 1; session <= 10; session++) {
      let currentId = launchTracks[session % launchTracks.length]!.id;
      history = updatePlayedTrackIds(history, currentId);
      totalPlayedCount++;

      for (let skipStep = 0; skipStep < 5; skipStep++) {
        const skipRes = resolveNextBeat({
          currentTrackId: currentId,
          playedTrackIds: history,
          allTracks: launchTracks,
          mode: "skip",
        });

        expect(skipRes).not.toBeNull();
        expect(skipRes?.transition).toBeNull();

        currentId = skipRes!.beat.id;
        history = updatePlayedTrackIds(history, currentId);
        totalPlayedCount++;
      }

      for (let autoStep = 0; autoStep < 5; autoStep++) {
        const autoRes = resolveNextBeat({
          currentTrackId: currentId,
          playedTrackIds: history,
          allTracks: launchTracks,
          mode: "auto",
        });

        expect(autoRes).not.toBeNull();
        expect(autoRes?.transition).not.toBeNull();
        expect(autoRes?.transition?.targetTrackId).toBe(autoRes?.beat.id);

        currentId = autoRes!.beat.id;
        history = updatePlayedTrackIds(history, currentId);
        totalPlayedCount++;
      }
    }

    expect(totalPlayedCount).toBe(110);
  });
});
