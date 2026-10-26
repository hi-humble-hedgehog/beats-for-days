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

const TRACK_COLUMNS =
  "id, name, bpm, duration_ms, loop_start_ms, loop_end_ms, audio_path";
const TRANSITION_COLUMNS = "id, from_track_id, to_track_id, audio_path, timing";

/** Picks local static files or Supabase Storage CDN URLs for audio paths. */
function createAudioUrlResolver(
  client: SupabaseClient,
  useLocalAudio: boolean,
): (audioPath: string) => string {
  const shouldUseLocalAudio = useLocalAudio || !client.storage;
  return (audioPath: string) => {
    if (shouldUseLocalAudio) {
      return audioPath.startsWith("/") ? audioPath : `/audio/${audioPath}`;
    }
    const { data } = client.storage.from("audio").getPublicUrl(audioPath);
    return data.publicUrl;
  };
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
    client.from("tracks").select(TRACK_COLUMNS).order("name"),
    client.from("transitions").select(TRANSITION_COLUMNS),
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

  return buildBeatViews(
    tracks,
    transitions,
    createAudioUrlResolver(client, useLocalAudio),
  );
}

/**
 * Loads one beat and only its outgoing transitions, so a cold load or history
 * jump never reads the whole catalog (ADR 0013). Returns `null` for unknown ids.
 */
export async function fetchBeatViewById(
  id: string,
  client: SupabaseClient = getSupabaseServerClient(),
  useLocalAudio: boolean = getServerEnv().USE_LOCAL_AUDIO,
): Promise<BeatView | null> {
  const [trackResult, transitionsResult] = await Promise.all([
    client.from("tracks").select(TRACK_COLUMNS).eq("id", id).maybeSingle(),
    client
      .from("transitions")
      .select(TRANSITION_COLUMNS)
      .eq("from_track_id", id),
  ]);

  if (trackResult.error) {
    throw new Error(`Failed to fetch track: ${trackResult.error.message}`);
  }
  if (transitionsResult.error) {
    throw new Error(
      `Failed to fetch transitions: ${transitionsResult.error.message}`,
    );
  }
  if (!trackResult.data) {
    return null;
  }

  const transitions = (transitionsResult.data ?? []) as TransitionRow[];
  const [beat] = buildBeatViews(
    [trackResult.data as TrackRow],
    transitions,
    createAudioUrlResolver(client, useLocalAudio),
  );
  return beat ?? null;
}
