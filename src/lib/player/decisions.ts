import type { AdvanceMode, PlaybackPhase } from "@/lib/types/audio";
import type { BeatView, TransitionView } from "@/lib/types/beat";
import { extractBeatIdFromPathname } from "./url";

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

export interface PlayerUiState {
  activePathname: string;
  isPlaying: boolean;
  phase: PlaybackPhase;
  secondsRemaining: number;
  positionSec: number;
  error: string | null;
}

export type PlayerAction =
  | { type: "set_playing"; isPlaying: boolean }
  | { type: "toggle_playing" }
  | {
      type: "sync_snapshot";
      phase: PlaybackPhase;
      secondsRemaining: number;
      positionSec: number;
    }
  | { type: "set_pathname"; pathname: string }
  | { type: "set_error"; error: string | null };

/**
 * Creates the initial UI reducer state for the audio player provider.
 */
export function createInitialPlayerUiState(pathname: string): PlayerUiState {
  return {
    activePathname: pathname,
    isPlaying: false,
    phase: "idle",
    secondsRemaining: 0,
    positionSec: 0,
    error: null,
  };
}

/**
 * Pure state reducer for player playback UI, route pathname, and engine snapshot fields.
 * Keeps state transitions predictable and out of multi-setter hook options.
 */
export function playerReducer(
  state: PlayerUiState,
  action: PlayerAction,
): PlayerUiState {
  switch (action.type) {
    case "set_playing":
      return { ...state, isPlaying: action.isPlaying };
    case "toggle_playing":
      return { ...state, isPlaying: !state.isPlaying };
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
  }
}
