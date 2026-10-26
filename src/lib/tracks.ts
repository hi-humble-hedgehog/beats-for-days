import "server-only";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";
import { getSupabaseServerClient } from "./supabase";
import type { BeatView, TransitionTiming } from "./types/beat";

export interface TrackRow {
  id: string;
  name: string;
  bpm: number;
  duration_ms: number;
  loop_start_ms: number;
  loop_end_ms: number;
  audio_path: string;
}

export interface TransitionRow {
  id: string;
  from_track_id: string;
  to_track_id: string;
  audio_path: string;
  timing: TransitionTiming;
}

export type { BeatView, TransitionTiming };

/**
 * Maps raw database track and transition rows into presentation-ready beat views.
 * Resolves storage paths to URLs and links transition timings to parent tracks.
 */
export function buildBeatViews(
  tracks: TrackRow[],
  transitions: TransitionRow[],
  resolveAudioUrl: (path: string) => string,
): BeatView[] {
  return tracks.map((track) => {
    const trackTransitions = transitions
      .filter((tr) => tr.from_track_id === track.id)
      .map((tr) => ({
        id: tr.id,
        targetTrackId: tr.to_track_id,
        audioUrl: resolveAudioUrl(tr.audio_path),
        timing: tr.timing,
      }));

    return {
      id: track.id,
      name: track.name,
      audioUrl: resolveAudioUrl(track.audio_path),
      durationMs: track.duration_ms,
      loopStartMs: track.loop_start_ms,
      loopEndMs: track.loop_end_ms,
      bpm: track.bpm,
      transitions: trackTransitions,
    };
  });
}

/**
 * Loads all beats and transitions from Supabase with loop points and timing.
 * Serves audio from local static files or the Supabase Storage CDN based on configuration.
 */
export async function fetchBeatViews(
  client: SupabaseClient = getSupabaseServerClient(),
  useLocalAudio: boolean = getServerEnv().USE_LOCAL_AUDIO,
): Promise<BeatView[]> {
  const [tracksResult, transitionsResult] = await Promise.all([
    client
      .from("tracks")
      .select(
        "id, name, bpm, duration_ms, loop_start_ms, loop_end_ms, audio_path",
      )
      .order("name"),
    client
      .from("transitions")
      .select("id, from_track_id, to_track_id, audio_path, timing"),
  ]);

  if (tracksResult.error) {
    throw new Error(`Failed to fetch tracks: ${tracksResult.error.message}`);
  }
  if (transitionsResult.error) {
    throw new Error(
      `Failed to fetch transitions: ${transitionsResult.error.message}`,
    );
  }

  const tracks = (tracksResult.data ?? []) as TrackRow[];
  const transitions = (transitionsResult.data ?? []) as TransitionRow[];

  const shouldUseLocalAudio = useLocalAudio || !client?.storage;

  const resolveAudioUrl = (audioPath: string) => {
    if (shouldUseLocalAudio) {
      return audioPath.startsWith("/") ? audioPath : `/audio/${audioPath}`;
    }
    const { data } = client.storage.from("audio").getPublicUrl(audioPath);
    return data.publicUrl;
  };

  return buildBeatViews(tracks, transitions, resolveAudioUrl);
}

/**
 * Loads a single beat view by its unique track ID.
 * Returns `null` when the requested track ID is not found.
 */
export async function fetchBeatViewById(
  id: string,
  client: SupabaseClient = getSupabaseServerClient(),
  useLocalAudio: boolean = getServerEnv().USE_LOCAL_AUDIO,
): Promise<BeatView | null> {
  const allBeats = await fetchBeatViews(client, useLocalAudio);
  return allBeats.find((beat) => beat.id === id) ?? null;
}
