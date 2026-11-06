import type { BeatView } from "@/lib/types/beat";

function countUnheardExits(
  track: BeatView | undefined,
  playedSet: Set<string>,
): number {
  if (!track) return 0;
  return track.transitions.filter((t) => !playedSet.has(t.targetTrackId))
    .length;
}

function pickNextWalkExit(
  current: BeatView,
  playedSet: Set<string>,
  trackMap: Map<string, BeatView>,
): string | null {
  const unheard = current.transitions.filter(
    (t) => !playedSet.has(t.targetTrackId) && trackMap.has(t.targetTrackId),
  );
  if (unheard.length === 0) return null;

  const scored = unheard.map((tr) => ({
    targetId: tr.targetTrackId,
    degree: countUnheardExits(trackMap.get(tr.targetTrackId), playedSet),
  }));

  const withRunway = scored.filter((s) => s.degree > 0);
  const pool = withRunway.length > 0 ? withRunway : scored;
  const minDegree = Math.min(...pool.map((s) => s.degree));
  const best = pool.filter((s) => s.degree === minDegree);

  return best[0]?.targetId ?? unheard[0]!.targetTrackId;
}

/**
 * Simulates a greedy continuous walk without repeats starting at a track.
 * Evaluates Warnsdorff exits step-by-step until the walk completes or gets trapped.
 */
export function simulateZeroRepeatWalk(
  startTrack: BeatView,
  allTracks: BeatView[],
): number {
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));
  const playedSet = new Set<string>([startTrack.id]);
  let current: BeatView = startTrack;

  while (playedSet.size < allTracks.length) {
    const nextId = pickNextWalkExit(current, playedSet, trackMap);
    if (!nextId) break;
    playedSet.add(nextId);
    current = trackMap.get(nextId)!;
  }

  return playedSet.size;
}

/**
 * Discovers candidate starting tracks capable of the longest continuous zero-repeat walk.
 * Filters to tracks achieving the maximum unique walk length across the active collection.
 */
export function getZeroRepeatWalkCandidates(allTracks: BeatView[]): BeatView[] {
  if (allTracks.length === 0) return [];
  if (allTracks.length === 1) return allTracks;

  const scored = allTracks.map((t) => ({
    track: t,
    walkLength: simulateZeroRepeatWalk(t, allTracks),
  }));

  const maxLen = Math.max(...scored.map((s) => s.walkLength));
  return scored.filter((s) => s.walkLength === maxLen).map((s) => s.track);
}
