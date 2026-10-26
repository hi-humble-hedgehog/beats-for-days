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
  pickRandom?: (max: number) => number;
}

function defaultPickRandom(max: number): number {
  return Math.floor(Math.random() * max);
}

function findUnheardExit(
  transitions: BeatView["transitions"],
  playedSet: Set<string>,
  pickRandom: (max: number) => number,
): string | null {
  const unheard = transitions.filter((t) => !playedSet.has(t.targetTrackId));
  if (unheard.length === 0) return null;
  const picked = unheard[pickRandom(unheard.length)] ?? unheard[0];
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

  let lowestDegree = Number.POSITIVE_INFINITY;
  for (const c of valid) {
    const deg = inDegreeMap[c.id] ?? 0;
    if (deg < lowestDegree) {
      lowestDegree = deg;
    }
  }

  const bestCandidates = valid.filter(
    (c) => (inDegreeMap[c.id] ?? 0) === lowestDegree,
  );
  const picked =
    bestCandidates[pickRandom(bestCandidates.length)] ?? bestCandidates[0];
  return picked?.id ?? null;
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
  const fallbackCandidates = allTracks.filter((t) => t.id !== currentTrackId);
  if (fallbackCandidates.length === 0) {
    return currentTrackId;
  }
  const picked =
    fallbackCandidates[pickRandom(fallbackCandidates.length)] ??
    fallbackCandidates[0];
  return picked?.id ?? currentTrackId;
}

/**
 * Picks the next beat to play in three steps:
 * 1. Use an existing transition to an unheard beat (free, no AI call).
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
    pickRandom = defaultPickRandom,
  } = params;

  const playedSet = new Set(playedTrackIds);

  // 1. Pick an unheard existing exit if available (randomly if multiple exist)
  const unheardExit = findUnheardExit(
    currentTrack.transitions,
    playedSet,
    pickRandom,
  );
  if (unheardExit) {
    return unheardExit;
  }

  // 2. If below outgoing cap, find unheard candidate with lowest in_degree
  if (currentTrack.transitions.length < maxDegreeCap) {
    const unheardCandidates = allTracks.filter(
      (t) => t.id !== currentTrack.id && !playedSet.has(t.id),
    );
    const candidateId = findLowestInDegreeCandidate(
      unheardCandidates,
      inDegreeMap,
      maxDegreeCap,
      pickRandom,
    );
    if (candidateId) {
      return candidateId;
    }
  }

  // 3. Fallback: pick existing exit whose target is oldest in played history
  const oldestExit = findOldestHeardExit(
    currentTrack.transitions,
    playedTrackIds,
  );
  if (oldestExit) {
    return oldestExit;
  }

  // Final fallback if no transitions exist at all
  return findFallbackTrack(allTracks, currentTrack.id, pickRandom);
}

export interface ResolveNextBeatParams {
  currentTrackId?: string;
  playedTrackIds: string[];
  allTracks: BeatView[];
  mode?: "auto" | "skip";
  inDegreeMap?: Record<string, number>;
  maxDegreeCap?: number;
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
    const picked = unheard[pickRandom(unheard.length)] ?? unheard[0];
    if (picked) return picked;
  }
  const fallback = allTracks.filter((t) => t.id !== currentTrackId);
  if (fallback.length > 0) {
    const picked = fallback[pickRandom(fallback.length)] ?? fallback[0];
    if (picked) return picked;
  }
  return allTracks[0]!;
}

/**
 * Resolves the next beat and transition audio to play based on recent listening history.
 * Evaluates the transition graph in auto mode, or picks an unheard track with no transition in skip mode.
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
    pickRandom = defaultPickRandom,
  } = params;

  if (allTracks.length === 0) return null;

  const currentTrack = currentTrackId
    ? allTracks.find((t) => t.id === currentTrackId)
    : undefined;

  if (!currentTrack || mode !== "auto") {
    const playedSet = new Set(playedTrackIds);
    const candidate = findSkipCandidate(
      allTracks,
      playedSet,
      pickRandom,
      currentTrackId,
    );
    return { beat: candidate, transition: null };
  }

  const nextId = selectNextGraphTrack({
    currentTrack,
    playedTrackIds,
    allTracks,
    inDegreeMap,
    maxDegreeCap,
    pickRandom,
  });

  const nextBeat = allTracks.find((t) => t.id === nextId) ?? allTracks[0]!;
  const transition =
    currentTrack.transitions.find((tr) => tr.targetTrackId === nextBeat.id) ??
    null;

  return { beat: nextBeat, transition };
}
