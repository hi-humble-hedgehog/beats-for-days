import "server-only";
import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { deriveTrackLabel } from "./tracks";

export interface AdminTrackRecord {
  id: string;
  name: string;
  bpm: number;
  key: string;
  genre: string;
  lead_instrument?: string | null;
  counter_instrument?: string | null;
  duration_ms: number;
  loop_start_ms: number;
  loop_end_ms: number;
  loop_duration_ms: number;
  audio_path: string;
  audio_url?: string;
  is_active: boolean;
  index?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminTransitionView {
  id: string;
  from_track_id: string;
  to_track_id: string;
  from_label: string;
  to_label: string;
  audio_path: string;
  audio_url: string;
  timing: {
    handleMs: number;
    crossfadeMs: number;
    glueMs: number;
    landMs: number;
  };
}

export interface AdminTrackTransitionsResult {
  outTransitions: AdminTransitionView[];
  inTransitions: AdminTransitionView[];
}

export const updateTrackSchema = z.object({
  name: z.string().trim().min(1).optional(),
  index: z.number().int().positive().nullable().optional(),
  bpm: z.number().int().positive().optional(),
  key: z.string().trim().min(1).optional(),
  genre: z.string().trim().min(1).optional(),
  lead_instrument: z.string().trim().nullable().optional(),
  counter_instrument: z.string().trim().nullable().optional(),
  duration_ms: z.number().int().positive().optional(),
  loop_start_ms: z.number().int().min(0).optional(),
  loop_end_ms: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

export const createTrackSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-_]+$/i, "Invalid track ID format"),
  name: z.string().trim().min(1),
  index: z.coerce.number().int().positive().optional(),
  bpm: z.coerce.number().int().positive(),
  key: z.string().trim().min(1),
  genre: z.string().trim().min(1),
  lead_instrument: z.string().trim().optional(),
  counter_instrument: z.string().trim().optional(),
  duration_ms: z.coerce.number().int().positive(),
  loop_start_ms: z.coerce.number().int().min(0),
  loop_end_ms: z.coerce.number().int().positive(),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;

const ADMIN_SELECT_COLUMNS =
  'id, name, bpm, key, genre, lead_instrument, counter_instrument, duration_ms, loop_start_ms, loop_end_ms, loop_duration_ms, audio_path, is_active, "index", created_at, updated_at';

const ADMIN_FALLBACK_COLUMNS =
  "id, name, bpm, key, genre, lead_instrument, counter_instrument, duration_ms, loop_start_ms, loop_end_ms, loop_duration_ms, audio_path, is_active, created_at";

/**
 * Resolves an audio storage path to either a local static route or Supabase public URL.
 * Falls back to local audio if configured or if client lacks storage access.
 */
export function resolveAdminAudioUrl(
  client: SupabaseClient,
  audioPath?: string,
  useLocalAudio: boolean = true,
): string {
  if (!audioPath) return "";
  if (useLocalAudio || !client.storage) {
    return audioPath.startsWith("/") ? audioPath : `/audio/${audioPath}`;
  }
  const { data } = client.storage.from("audio").getPublicUrl(audioPath);
  return data.publicUrl;
}

/**
 * Loads all catalog tracks including disabled items for the admin dashboard.
 * Orders results primarily by sequential index, then alphabetically by name.
 */
export async function fetchAdminTracks(
  client: SupabaseClient,
  useLocalAudio: boolean = true,
): Promise<AdminTrackRecord[]> {
  const result = await client
    .from("tracks")
    .select(ADMIN_SELECT_COLUMNS)
    .order("index", { ascending: true, nullsFirst: false })
    .order("name");

  let data = result.data as AdminTrackRecord[] | null;
  let error = result.error;

  if (
    error &&
    (error.message.includes("updated_at") || error.message.includes("index"))
  ) {
    const fallback = await client
      .from("tracks")
      .select(ADMIN_FALLBACK_COLUMNS)
      .order("name");
    data = fallback.data as AdminTrackRecord[] | null;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Failed to fetch admin tracks: ${error.message}`);
  }

  return (data ?? []).map((track) => ({
    ...track,
    audio_url: resolveAdminAudioUrl(client, track.audio_path, useLocalAudio),
  }));
}

/**
 * Applies metadata updates or active-state toggles to a track record.
 * Recomputes loop duration automatically if loop points are updated.
 */
export async function updateAdminTrack(
  client: SupabaseClient,
  id: string,
  patch: UpdateTrackInput,
): Promise<AdminTrackRecord> {
  const payload: Record<string, unknown> = { ...patch };

  if (patch.loop_start_ms !== undefined && patch.loop_end_ms !== undefined) {
    payload.loop_duration_ms = patch.loop_end_ms - patch.loop_start_ms;
  }
  if (patch.index !== undefined && patch.index !== null && !patch.name) {
    payload.name = String(patch.index).padStart(2, "0");
  }

  const { data, error } = await client
    .from("tracks")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update track ${id}: ${error.message}`);
  }

  return data as AdminTrackRecord;
}

/**
 * Inserts a freshly uploaded audio track record into the database.
 * Computes loop duration and defaults is_active to true.
 */
export async function createAdminTrack(
  client: SupabaseClient,
  track: CreateTrackInput & { audio_path: string; is_active?: boolean },
): Promise<AdminTrackRecord> {
  const loopDurationMs = track.loop_end_ms - track.loop_start_ms;
  const name =
    track.index !== undefined && (!track.name || /^\d+$/.test(track.name))
      ? String(track.index).padStart(2, "0")
      : track.name;
  const payload = {
    ...track,
    name,
    loop_duration_ms: loopDurationMs,
    is_active: track.is_active ?? true,
    sections: [],
  };

  const { data, error } = await client
    .from("tracks")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create track ${track.id}: ${error.message}`);
  }

  return data as AdminTrackRecord;
}

/**
 * Uploads an M4A audio file buffer to the audio storage bucket.
 * Overwrites existing files at the target path if upserting.
 */
export async function uploadTrackAudio(
  client: SupabaseClient,
  storagePath: string,
  fileBuffer: Buffer | Uint8Array,
): Promise<void> {
  const { error } = await client.storage
    .from("audio")
    .upload(storagePath, fileBuffer, {
      contentType: "audio/mp4",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Storage upload failed for ${storagePath}: ${error.message}`,
    );
  }
}

/** Fetches track IDs and resolved 2-digit display labels. */
async function fetchTrackLabels(
  client: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const primary = await client.from("tracks").select('id, name, "index"');
  let data: Array<{
    id: string;
    name: string;
    index?: number | null;
  }> | null = primary.data;
  if (primary.error && primary.error.message.includes("index")) {
    const fallback = await client.from("tracks").select("id, name");
    data = fallback.data;
  }
  for (const track of data ?? []) {
    map.set(track.id, deriveTrackLabel(track));
  }
  return map;
}

/**
 * Loads incoming and outgoing transitions connected to a track.
 * Resolves 2-digit track labels and audio URLs for audition playback.
 */
export async function fetchAdminTrackTransitions(
  client: SupabaseClient,
  trackId: string,
  useLocalAudio: boolean = true,
): Promise<AdminTrackTransitionsResult> {
  const { data: transitions, error } = await client
    .from("transitions")
    .select("id, from_track_id, to_track_id, audio_path, timing")
    .or(`from_track_id.eq.${trackId},to_track_id.eq.${trackId}`);

  if (error) {
    throw new Error(
      `Failed to fetch transitions for track ${trackId}: ${error.message}`,
    );
  }

  const labelMap = await fetchTrackLabels(client);
  const outTransitions: AdminTransitionView[] = [];
  const inTransitions: AdminTransitionView[] = [];

  for (const tr of transitions ?? []) {
    const view: AdminTransitionView = {
      id: tr.id,
      from_track_id: tr.from_track_id,
      to_track_id: tr.to_track_id,
      from_label: labelMap.get(tr.from_track_id) ?? tr.from_track_id,
      to_label: labelMap.get(tr.to_track_id) ?? tr.to_track_id,
      audio_path: tr.audio_path,
      audio_url: resolveAdminAudioUrl(client, tr.audio_path, useLocalAudio),
      timing: tr.timing,
    };
    if (tr.from_track_id === trackId) outTransitions.push(view);
    if (tr.to_track_id === trackId) inTransitions.push(view);
  }

  outTransitions.sort((a, b) =>
    a.to_label.localeCompare(b.to_label, undefined, { numeric: true }),
  );
  inTransitions.sort((a, b) =>
    a.from_label.localeCompare(b.from_label, undefined, { numeric: true }),
  );

  return { outTransitions, inTransitions };
}
