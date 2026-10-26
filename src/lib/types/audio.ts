import type { BeatView } from "./beat";

export type PlaybackPhase = "idle" | "playing" | "armed" | "bridge";
export type AdvanceMode = "auto" | "skip";

export interface AudioPlayerState {
  current: BeatView | null;
  activePathname?: string;
  isPlaying: boolean;
  phase?: PlaybackPhase;
  secondsRemaining: number;
  positionSec?: number;
  isLoading: boolean;
  error: string | null;
  playedHistory?: string[];
  togglePlay: () => void;
  play?: () => void;
  pause?: () => void;
  skip?: () => void;
  autoAdvance?: () => void;
  advanceTrack: (mode?: AdvanceMode) => void;
}
