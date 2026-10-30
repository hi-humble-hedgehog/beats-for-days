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
  is_active?: boolean;
  index?: number | null;
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
 * Resolves the 2-digit label for a track (`01`, `02`, ..., `10`, etc.).
 * Prioritizes sequential index, then numeric track ID/name, with zero-padding.
 */
export function deriveTrackLabel(
  track: Pick<TrackRow, "id" | "name"> & { index?: number | null },
): string {
  if (track.index !== undefined && track.index !== null && track.index > 0) {
    return String(track.index).padStart(2, "0");
  }
  const match = /^track-(\d+)$/i.exec(track.id) ?? /^(\d+)$/.exec(track.name);
  if (match && match[1]) {
    return String(Number(match[1])).padStart(2, "0");
  }
  return track.name;
}

/**
 * Maps raw database track and transition rows into presentation-ready beat views.
 * Resolves storage paths to URLs and links transition timings to parent tracks.
 */
export function buildBeatViews(
  tracks: TrackRow[],
  transitions: TransitionRow[],
  resolveAudioUrl: (path: string) => string,
): BeatView[] {
  const disabledTrackIds = new Set(
    tracks.filter((t) => t.is_active === false).map((t) => t.id),
  );

  return tracks
    .filter((track) => track.is_active !== false)
    .map((track) => {
      const label = deriveTrackLabel(track);
      const trackTransitions = transitions
        .filter(
          (tr) =>
            tr.from_track_id === track.id &&
            !disabledTrackIds.has(tr.to_track_id),
        )
        .map((tr) => ({
          id: tr.id,
          targetTrackId: tr.to_track_id,
          audioUrl: resolveAudioUrl(tr.audio_path),
          timing: tr.timing,
        }));

      return {
        id: track.id,
        name: label,
        index:
          track.index ??
          (Number.isInteger(Number(label)) ? Number(label) : undefined),
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
  'id, name, bpm, duration_ms, loop_start_ms, loop_end_ms, audio_path, is_active, "index"';
const TRACK_COLUMNS_LEGACY =
  "id, name, bpm, duration_ms, loop_start_ms, loop_end_ms, audio_path, is_active";
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
 * Loads all beats and transitions from Supabase ordered by index and name.
 * Serves audio from local static files or the Supabase Storage CDN based on configuration.
 */
export async function fetchBeatViews(
  client: SupabaseClient = getSupabaseServerClient(),
  useLocalAudio: boolean = getServerEnv().USE_LOCAL_AUDIO,
): Promise<BeatView[]> {
  let tracksResult = await client
    .from("tracks")
    .select(TRACK_COLUMNS)
    .order("index", { ascending: true, nullsFirst: false })
    .order("name");

  if (tracksResult.error && tracksResult.error.message.includes("index")) {
    tracksResult = (await client
      .from("tracks")
      .select(TRACK_COLUMNS_LEGACY)
      .order("name")) as unknown as typeof tracksResult;
  }

  const transitionsResult = await client
    .from("transitions")
    .select(TRANSITION_COLUMNS);

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

function buildTrackOrFilter(id: string): {
  candidates: string[];
  orFilter: string;
} {
  const num = Number(id);
  const candidates = [id];
  const isPositiveNum = !Number.isNaN(num) && num > 0;
  if (isPositiveNum) {
    const padded = String(num).padStart(2, "0");
    candidates.push(padded, `track-${padded}`, `track-${num}`);
  }
  const baseFilter = candidates.map((c) => `id.eq.${c},name.eq.${c}`).join(",");
  const orFilter = isPositiveNum ? `${baseFilter},index.eq.${num}` : baseFilter;
  return { candidates, orFilter };
}

async function querySingleTrack(
  client: SupabaseClient,
  candidates: string[],
  orFilter: string,
): Promise<TrackRow | null> {
  let result = await client
    .from("tracks")
    .select(TRACK_COLUMNS)
    .or(orFilter)
    .maybeSingle();

  if (result.error && result.error.message.includes("index")) {
    const legacyFilter = candidates
      .map((c) => `id.eq.${c},name.eq.${c}`)
      .join(",");
    result = (await client
      .from("tracks")
      .select(TRACK_COLUMNS_LEGACY)
      .or(legacyFilter)
      .maybeSingle()) as unknown as typeof result;
  }

  if (result.error) {
    throw new Error(`Failed to fetch track: ${result.error.message}`);
  }
  return (result.data as TrackRow | null) ?? null;
}

/**
 * Loads one beat by ID, slug, or sequential index.
 */
export async function fetchBeatViewById(
  id: string,
  client: SupabaseClient = getSupabaseServerClient(),
  useLocalAudio: boolean = getServerEnv().USE_LOCAL_AUDIO,
): Promise<BeatView | null> {
  const { candidates, orFilter } = buildTrackOrFilter(id);
  const rawTrack = await querySingleTrack(client, candidates, orFilter);
  if (!rawTrack) {
    return null;
  }

  const transitionsResult = await client
    .from("transitions")
    .select(TRANSITION_COLUMNS)
    .or(`from_track_id.eq.${rawTrack.id},from_track_id.eq.${id}`);

  if (transitionsResult.error) {
    throw new Error(
      `Failed to fetch transitions: ${transitionsResult.error.message}`,
    );
  }

  const transitions = (transitionsResult.data ?? []) as TransitionRow[];
  const [beat] = buildBeatViews(
    [rawTrack],
    transitions,
    createAudioUrlResolver(client, useLocalAudio),
  );
  return beat ?? null;
}
