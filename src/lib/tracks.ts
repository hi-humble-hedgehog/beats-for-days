import "server-only";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "./supabase";

export interface TrackRow {
  id: string;
  name: string;
  audio_path: string;
}

export interface TransitionRow {
  id: string;
  from_track_id: string;
  to_track_id: string;
  audio_path: string;
}

import type { BeatView } from "./types/beat";
export type { BeatView };

export function buildBeatViews(
  tracks: TrackRow[],
  transitions: TransitionRow[],
  resolveAudioUrl: (path: string) => string,
): BeatView[] {
  const trackMap = new Map(tracks.map((t) => [t.id, t.name]));

  return tracks.map((track) => {
    const trackTransitions = transitions
      .filter((tr) => tr.from_track_id === track.id)
      .map((tr) => ({
        id: tr.id,
        targetTrackName: trackMap.get(tr.to_track_id) ?? tr.to_track_id,
        audioUrl: resolveAudioUrl(tr.audio_path),
      }));

    return {
      id: track.id,
      name: track.name,
      audioUrl: resolveAudioUrl(track.audio_path),
      transitions: trackTransitions,
    };
  });
}

export async function fetchBeatViews(
  client: SupabaseClient = getSupabaseServerClient(),
): Promise<BeatView[]> {
  const [tracksResult, transitionsResult] = await Promise.all([
    client.from("tracks").select("id, name, audio_path").order("name"),
    client
      .from("transitions")
      .select("id, from_track_id, to_track_id, audio_path"),
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

  const resolveAudioUrl = (audioPath: string) => {
    const { data } = client.storage.from("audio").getPublicUrl(audioPath);
    return data.publicUrl;
  };

  return buildBeatViews(tracks, transitions, resolveAudioUrl);
}
