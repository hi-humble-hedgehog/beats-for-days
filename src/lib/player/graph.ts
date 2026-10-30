import { LIMITS } from "@/lib/constants";
import type { BeatView, TransitionView } from "@/lib/types/beat";

/**
 * Moves `currentTrackId` to the end of the play history list without duplicates.
 * Keeps the list ordered from oldest to newest so we know which beat was heard longest ago.
 */
export function updatePlayedTrackIds(
  playedTrackIds: string[],
  currentTrackId: string,
): string[] {
  return [
    ...playedTrackIds.filter((id) => id !== currentTrackId),
    currentTrackId,
  ];
}

export interface GraphSelectionParams {
  currentTrack: BeatView;
  playedTrackIds: string[];
  allTracks: BeatView[];
  inDegreeMap?: Record<string, number>;
  maxDegreeCap?: number;
  cooldownWindow?: number;
  pickRandom?: (max: number) => number;
}

function defaultPickRandom(max: number): number {
  return Math.floor(Math.random() * max);
}

function getEffectivePlayedSet(
  playedTrackIds: string[],
  allTracks: BeatView[],
  cooldownWindow: number,
): Set<string> {
  const fullSet = new Set(playedTrackIds);
  if (
    allTracks.length > cooldownWindow &&
    allTracks.every((t) => fullSet.has(t.id))
  ) {
    return new Set(playedTrackIds.slice(-cooldownWindow));
  }
  return fullSet;
}

function countUnheardExits(
  track: BeatView | undefined,
  playedSet: Set<string>,
  excludedId: string,
): number {
  if (!track) return 0;
  return track.transitions.filter(
    (t) =>
      !playedSet.has(t.targetTrackId) &&
      t.targetTrackId !== excludedId &&
      t.targetTrackId !== track.id,
  ).length;
}

function pickByWarnsdorffDegree<T>(
  items: T[],
  getDegree: (item: T) => number,
  pickRandom: (max: number) => number,
): T | null {
  if (items.length === 0) return null;
  const scored = items.map((item) => ({ item, degree: getDegree(item) }));
  const withRunway = scored.filter((s) => s.degree > 0);
  const pool = withRunway.length > 0 ? withRunway : scored;
  const minDegree = Math.min(...pool.map((s) => s.degree));
  const best = pool.filter((s) => s.degree === minDegree);
  const picked = best[pickRandom(best.length)] ?? best[0];
  return picked ? picked.item : null;
}

function findUnheardExit(
  currentTrack: BeatView,
  allTracks: BeatView[],
  playedSet: Set<string>,
  pickRandom: (max: number) => number,
): string | null {
  const unheard = currentTrack.transitions.filter(
    (t) =>
      !playedSet.has(t.targetTrackId) && t.targetTrackId !== currentTrack.id,
  );
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));
  const picked = pickByWarnsdorffDegree(
    unheard,
    (t) =>
      countUnheardExits(
        trackMap.get(t.targetTrackId),
        playedSet,
        currentTrack.id,
      ),
    pickRandom,
  );
  return picked ? picked.targetTrackId : null;
}

function findLowestInDegreeCandidate(
  candidates: BeatView[],
  inDegreeMap: Record<string, number>,
  cap: number,
  pickRandom: (max: number) => number,
): string | null {
  const valid = candidates.filter((t) => (inDegreeMap[t.id] ?? 0) < cap);
  if (valid.length === 0) return null;
  const lowest = Math.min(...valid.map((c) => inDegreeMap[c.id] ?? 0));
  const best = valid.filter((c) => (inDegreeMap[c.id] ?? 0) === lowest);
  return (best[pickRandom(best.length)] ?? best[0])?.id ?? null;
}

function findOldestHeardExit(
  transitions: BeatView["transitions"],
  playedTrackIds: string[],
): string | null {
  let oldestTarget: string | null = null;
  let oldestIndex = Number.POSITIVE_INFINITY;
  for (const tr of transitions) {
    const idx = playedTrackIds.indexOf(tr.targetTrackId);
    if (idx !== -1 && idx < oldestIndex) {
      oldestIndex = idx;
      oldestTarget = tr.targetTrackId;
    }
  }
  return oldestTarget;
}

function findFallbackTrack(
  allTracks: BeatView[],
  currentTrackId: string,
  pickRandom: (max: number) => number,
): string {
  const valid = allTracks.filter((t) => t.id !== currentTrackId);
  if (valid.length === 0) return currentTrackId;
  return (valid[pickRandom(valid.length)] ?? valid[0])?.id ?? currentTrackId;
}

/**
 * Picks the next beat to play in three steps:
 * 1. Use Warnsdorff 1-step lookahead to pick an unheard transition exit that still has open exits of its own.
 * 2. If this beat has room for more outgoing transitions, pick an unheard beat with the fewest incoming links.
 * 3. Otherwise, reuse the existing transition to the beat heard longest ago.
 */
export function selectNextGraphTrack(params: GraphSelectionParams): string {
  const {
    currentTrack,
    playedTrackIds,
    allTracks,
    inDegreeMap = {},
    maxDegreeCap = LIMITS.MAX_DEGREE_CAP,
    cooldownWindow = LIMITS.REPEAT_COOLDOWN_WINDOW,
    pickRandom = defaultPickRandom,
  } = params;

  const playedSet = getEffectivePlayedSet(
    playedTrackIds,
    allTracks,
    cooldownWindow,
  );

  const unheardExit = findUnheardExit(
    currentTrack,
    allTracks,
    playedSet,
    pickRandom,
  );
  if (unheardExit) return unheardExit;

  if (currentTrack.transitions.length < maxDegreeCap) {
    const unheard = allTracks.filter(
      (t) => t.id !== currentTrack.id && !playedSet.has(t.id),
    );
    const candidateId = findLowestInDegreeCandidate(
      unheard,
      inDegreeMap,
      maxDegreeCap,
      pickRandom,
    );
    if (candidateId) return candidateId;
  }

  return (
    findOldestHeardExit(currentTrack.transitions, playedTrackIds) ??
    findFallbackTrack(allTracks, currentTrack.id, pickRandom)
  );
}

export interface ResolveNextBeatParams {
  currentTrackId?: string;
  playedTrackIds: string[];
  allTracks: BeatView[];
  mode?: "auto" | "skip";
  inDegreeMap?: Record<string, number>;
  maxDegreeCap?: number;
  cooldownWindow?: number;
  pickRandom?: (max: number) => number;
}

export interface NextBeatResult {
  beat: BeatView;
  transition: TransitionView | null;
}

function findSkipCandidate(
  allTracks: BeatView[],
  playedSet: Set<string>,
  pickRandom: (max: number) => number,
  currentTrackId?: string,
): BeatView {
  const unheard = allTracks.filter(
    (t) => !playedSet.has(t.id) && t.id !== currentTrackId,
  );
  if (unheard.length > 0) {
    if (playedSet.size === 0 && !currentTrackId && unheard[0]) {
      return unheard[0];
    }
    const picked = pickByWarnsdorffDegree(
      unheard,
      (t) => countUnheardExits(t, playedSet, currentTrackId ?? t.id),
      pickRandom,
    );
    if (picked) return picked;
  }
  const fallback = allTracks.filter((t) => t.id !== currentTrackId);
  if (fallback.length > 0) {
    const picked = fallback[pickRandom(fallback.length)] ?? fallback[0];
    if (picked) return picked;
  }
  return allTracks[0]!;
}

function resolveSkipBeat(
  currentTrack: BeatView | undefined,
  allTracks: BeatView[],
  playedSet: Set<string>,
  pickRandom: (max: number) => number,
): NextBeatResult {
  const exitId = currentTrack
    ? findUnheardExit(currentTrack, allTracks, playedSet, pickRandom)
    : null;
  const exitBeat = exitId ? allTracks.find((t) => t.id === exitId) : undefined;
  const beat =
    exitBeat ??
    findSkipCandidate(allTracks, playedSet, pickRandom, currentTrack?.id);
  return { beat, transition: null };
}

/**
 * Resolves the next beat and transition audio to play based on recent listening history.
 * Walks the transition graph with 1-step Warnsdorff lookahead and a sliding repeat cooldown window in both auto and skip modes,
 * escaping local dead-ends to an unheard track with open exits in skip mode (`transition: null`).
 */
export function resolveNextBeat(
  params: ResolveNextBeatParams,
): NextBeatResult | null {
  const {
    currentTrackId,
    playedTrackIds,
    allTracks,
    mode = "auto",
    inDegreeMap,
    maxDegreeCap,
    cooldownWindow = LIMITS.REPEAT_COOLDOWN_WINDOW,
    pickRandom = defaultPickRandom,
  } = params;
  if (allTracks.length === 0) return null;

  const currentTrack = currentTrackId
    ? allTracks.find((t) => t.id === currentTrackId)
    : undefined;
  if (!currentTrack || mode !== "auto") {
    const playedSet = getEffectivePlayedSet(
      playedTrackIds,
      allTracks,
      cooldownWindow,
    );
    return resolveSkipBeat(currentTrack, allTracks, playedSet, pickRandom);
  }

  const nextId = selectNextGraphTrack({
    currentTrack,
    playedTrackIds,
    allTracks,
    inDegreeMap,
    maxDegreeCap,
    cooldownWindow,
    pickRandom,
  });
  const nextBeat = allTracks.find((t) => t.id === nextId) ?? allTracks[0]!;
  const transition =
    currentTrack.transitions.find((tr) => tr.targetTrackId === nextBeat.id) ??
    null;
  return { beat: nextBeat, transition };
}
