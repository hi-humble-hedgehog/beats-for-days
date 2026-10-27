import type { AdvanceMode, PlaybackPhase } from "@/lib/types/audio";
import type { BeatView, TransitionView } from "@/lib/types/beat";
import { extractBeatIdFromPathname, formatBeatUrl } from "./url";

export type { AdvanceMode, PlaybackPhase };

export type RouteIntent =
  | { kind: "pause" }
  | { kind: "load"; beatId: string }
  | { kind: "background" }
  | { kind: "none" };

/**
 * Decides how player playback and track loading should react to a route pathname.
 * Pauses on the root landing page, loads the target beat on `/beat/:slug` when
 * different from the active beat, and leaves playback running on other pages.
 */
export function resolveRouteIntent(
  pathname: string,
  currentBeatId: string | null | undefined,
): RouteIntent {
  if (pathname === "/") {
    return { kind: "pause" };
  }
  const targetBeatId = extractBeatIdFromPathname(pathname);
  if (!targetBeatId) {
    return { kind: "background" };
  }
  if (targetBeatId === currentBeatId) {
    return { kind: "none" };
  }
  return { kind: "load", beatId: targetBeatId };
}

export interface NextBeatResolution {
  beat: BeatView;
  transition: TransitionView | null;
}

export type AdvancePlan =
  | { kind: "arm"; beat: BeatView; transition: TransitionView }
  | { kind: "skip"; beat: BeatView }
  | { kind: "commit"; beat: BeatView };

/**
 * Plans the audio engine action after `/api/beats/next` resolves a track.
 * Arms a transition bridge on automatic resolution when available, skips
 * immediately when playing, or commits metadata when paused.
 */
export function planAdvance(
  mode: AdvanceMode,
  resolution: NextBeatResolution,
  isPlaying: boolean,
): AdvancePlan {
  if (mode === "auto" && resolution.transition) {
    return {
      kind: "arm",
      beat: resolution.beat,
      transition: resolution.transition,
    };
  }
  if (isPlaying) {
    return { kind: "skip", beat: resolution.beat };
  }
  return { kind: "commit", beat: resolution.beat };
}

export interface BeatDisplayInfo {
  slug: string;
  beatName: string | undefined;
  trackId: string;
}

/**
 * Computes the heading and track ID label for the beat deck from the active slug
 * and the loaded beat view, avoiding stale headings when the URL advances.
 */
export function selectBeatDisplayInfo(opts: {
  slug: string;
  current: Pick<BeatView, "id" | "name"> | null;
}): BeatDisplayInfo {
  const { slug, current } = opts;
  const isMatched = slug === "—" || current?.id === slug;
  return {
    slug,
    beatName: isMatched ? current?.name : undefined,
    trackId: isMatched ? (current?.id ?? slug) : slug,
  };
}

export interface ResolveStartBeatOptions {
  current: BeatView | null;
  hasPausedBeat?: boolean;
  playedHistory: string[];
  fetchNextBeat: (req: {
    currentTrackId?: string;
    playedTrackIds: string[];
    mode: "skip";
  }) => Promise<{ beat: BeatView }>;
  commitBeat?: (beat: BeatView) => void;
  startPlay: () => void;
  navigate?: (url: string) => void;
}

/**
 * Starts playback from Home, 404, or the persistent player bar.
 * Resumes the paused beat when playback was already started in this session, or
 * queries `/api/beats/next` with the current ID and history on a cold start.
 */
export async function resolveStartBeat(
  opts: ResolveStartBeatOptions,
): Promise<BeatView> {
  const {
    current,
    hasPausedBeat = Boolean(current),
    playedHistory,
    fetchNextBeat,
    commitBeat,
    startPlay,
    navigate,
  } = opts;

  if (current && hasPausedBeat) {
    startPlay();
    navigate?.(formatBeatUrl(current.id));
    return current;
  }

  const currentTrackId = current?.id ?? playedHistory[playedHistory.length - 1];
  const res = await fetchNextBeat({
    currentTrackId,
    playedTrackIds: playedHistory,
    mode: "skip",
  });
  commitBeat?.(res.beat);
  startPlay();
  navigate?.(formatBeatUrl(res.beat.id));
  return res.beat;
}

/**
 * Determines whether clicking Play in the persistent bar should resolve and navigate
 * to a beat deck (when stopped on Home, on a 404 route, or with no beat loaded).
 */
export function shouldResolveStartOnPlay(
  isPlaying: boolean,
  pathname: string,
  current: BeatView | null,
  notFoundBeatId?: string | null,
): boolean {
  if (isPlaying) {
    return false;
  }
  return pathname === "/" || Boolean(notFoundBeatId) || !current;
}

export interface PlayerUiState {
  activePathname: string;
  isPlaying: boolean;
  hasPausedBeat: boolean;
  notFoundBeatId: string | null;
  phase: PlaybackPhase;
  secondsRemaining: number;
  positionSec: number;
  muted: boolean;
  error: string | null;
}

export type PlayerAction =
  | { type: "set_playing"; isPlaying: boolean }
  | { type: "toggle_playing" }
  | { type: "toggle_mute" }
  | {
      type: "sync_snapshot";
      phase: PlaybackPhase;
      secondsRemaining: number;
      positionSec: number;
    }
  | { type: "set_pathname"; pathname: string }
  | { type: "set_error"; error: string | null }
  | { type: "set_not_found"; beatId: string | null };

export const PREVIOUS_RESTART_SEC = 3;

export type PreviousAction =
  { kind: "seek_start" } | { kind: "load_previous"; beatId: string };

/**
 * Drops the current beat from history so Previous can walk backward.
 * History stays oldest-to-newest; the last remaining id is the prior track.
 */
export function historyAfterPrevious(
  playedHistory: string[],
  currentId: string | null,
): string[] {
  if (!currentId) {
    return playedHistory.slice(0, -1);
  }
  const idx = playedHistory.lastIndexOf(currentId);
  if (idx <= 0) return [];
  return playedHistory.slice(0, idx);
}

/**
 * Classic transport Previous: restart after 3s, else load the earlier beat.
 * No earlier history also restarts so a first track never jumps into a void.
 */
export function resolvePreviousAction(opts: {
  positionSec: number;
  playedHistory: string[];
  currentId: string | null;
}): PreviousAction {
  if (opts.positionSec > PREVIOUS_RESTART_SEC) return { kind: "seek_start" };
  const prior = historyAfterPrevious(opts.playedHistory, opts.currentId);
  const beatId = prior[prior.length - 1];
  if (!beatId) return { kind: "seek_start" };
  return { kind: "load_previous", beatId };
}

/**
 * Creates the initial UI reducer state for the audio player provider.
 */
export function createInitialPlayerUiState(pathname: string): PlayerUiState {
  return {
    activePathname: pathname,
    isPlaying: false,
    hasPausedBeat: false,
    notFoundBeatId: null,
    phase: "idle",
    secondsRemaining: 0,
    positionSec: 0,
    muted: false,
    error: null,
  };
}

/**
 * Pure state reducer for player playback UI, route pathname, 404 state, and engine snapshot fields.
 * Keeps state transitions predictable and out of multi-setter hook options.
 */
export function playerReducer(
  state: PlayerUiState,
  action: PlayerAction,
): PlayerUiState {
  switch (action.type) {
    case "set_playing":
      return {
        ...state,
        isPlaying: action.isPlaying,
        hasPausedBeat: state.hasPausedBeat || action.isPlaying,
      };
    case "toggle_playing":
      return {
        ...state,
        isPlaying: !state.isPlaying,
        hasPausedBeat: true,
      };
    case "toggle_mute":
      return { ...state, muted: !state.muted };
    case "sync_snapshot":
      return {
        ...state,
        phase: action.phase,
        secondsRemaining: action.secondsRemaining,
        positionSec: action.positionSec,
      };
    case "set_pathname":
      return { ...state, activePathname: action.pathname };
    case "set_error":
      return { ...state, error: action.error };
    case "set_not_found":
      return {
        ...state,
        notFoundBeatId: action.beatId,
        isPlaying: action.beatId ? false : state.isPlaying,
      };
  }
}
