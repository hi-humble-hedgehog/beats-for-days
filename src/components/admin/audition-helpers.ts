import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";
import { AudioEngine } from "@/lib/audio/engine";
import type { BeatView, TransitionView } from "@/lib/types/beat";

export type AutoMixSetting = "off" | 1 | 2 | 4;
export type AuditionMode = "blend" | "bridge";

/** Resolves the track's public or local audio URL. */
export function resolveTrackAudioUrl(track: AdminTrackRecord): string {
  if (track.audio_url) return track.audio_url;
  return track.audio_path.startsWith("/")
    ? track.audio_path
    : `/audio/${track.audio_path}`;
}

/** Formats a track record into an audio engine BeatView. */
export function createBeatView(
  track: AdminTrackRecord,
  transitions: AdminTransitionView[],
): BeatView {
  return {
    id: track.id,
    name: track.name,
    audioUrl: resolveTrackAudioUrl(track),
    durationMs: track.duration_ms,
    loopStartMs: track.loop_start_ms,
    loopEndMs: track.loop_end_ms,
    bpm: track.bpm,
    index: track.index ?? undefined,
    transitions: transitions.map((t) => ({
      id: t.id,
      targetTrackId: t.to_track_id,
      audioUrl: t.audio_url,
      timing: t.timing,
    })),
  };
}

export interface AudioEventsHandler {
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onDuration: (dur: number) => void;
}

/** Attaches timeupdate, ended, and loadedmetadata listeners to audio element. */
export function attachAudioListeners(
  audio: HTMLAudioElement,
  handlers: AudioEventsHandler,
) {
  audio.addEventListener("timeupdate", () =>
    handlers.onTimeUpdate(audio.currentTime),
  );
  audio.addEventListener("ended", handlers.onEnded);
  audio.addEventListener("loadedmetadata", () => {
    if (audio.duration && Number.isFinite(audio.duration)) {
      handlers.onDuration(audio.duration);
    }
  });
}

/** Instantiates a Web Audio engine if supported in browser environment. */
export function getOrCreateAudioEngine(): AudioEngine | null {
  if (typeof window === "undefined") return null;
  const hasWebAudio = Boolean(
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext,
  );
  if (!hasWebAudio) return null;
  try {
    return new AudioEngine();
  } catch {
    return null;
  }
}

export interface BlendParams {
  engine: AudioEngine;
  currentTrack: AdminTrackRecord;
  targetTrack: AdminTrackRecord;
  transition: AdminTransitionView;
  outTransitions: AdminTransitionView[];
  startNearHandover: boolean;
  currentTime: number;
}

/** Executes a 3-node transition blend using AudioEngine. */
export async function executeBlend(params: BlendParams) {
  const {
    engine,
    currentTrack,
    targetTrack,
    transition,
    outTransitions,
    startNearHandover,
    currentTime,
  } = params;
  const beatView = createBeatView(currentTrack, outTransitions);
  const targetView = createBeatView(targetTrack, []);
  const transView: TransitionView = {
    id: transition.id,
    targetTrackId: transition.to_track_id,
    audioUrl: transition.audio_url,
    timing: transition.timing,
  };
  const offset = startNearHandover
    ? Math.max(0, currentTrack.loop_end_ms / 1000 - 8)
    : currentTime;

  await engine.loadTrack(beatView, offset);
  await engine.play();
  await engine.armTransition(targetView, transView, { minPass: 0 });
}
