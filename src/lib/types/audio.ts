import type { BeatView } from "./beat";

export type PlaybackPhase = "idle" | "playing" | "armed" | "bridge";

export interface AudioPlayerState {
  current: BeatView | null;
  isPlaying: boolean;
  phase?: PlaybackPhase;
  secondsRemaining: number;
  positionSec?: number;
  isLoading: boolean;
  error: string | null;
  togglePlay: () => void;
  advanceTrack: (mode?: "auto" | "skip" | unknown) => void;
}
