export interface TransitionTiming {
  handleMs: number;
  crossfadeMs: number;
  glueMs: number;
  landMs: number;
}

export interface TransitionView {
  id: string;
  targetTrackId: string;
  audioUrl: string;
  timing: TransitionTiming;
}

export interface BeatView {
  id: string;
  name: string;
  audioUrl: string;
  durationMs: number;
  loopStartMs: number;
  loopEndMs: number;
  bpm: number;
  transitions: TransitionView[];
  index?: number;
}
