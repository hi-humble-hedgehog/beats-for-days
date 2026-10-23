export interface TransitionView {
  id: string;
  targetTrackName: string;
  audioUrl: string;
}

export interface BeatView {
  id: string;
  name: string;
  audioUrl: string;
  transitions: TransitionView[];
}
