import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SeedTrack {
  id: string;
  name: string;
  bpm: number;
  key: string;
  genre: string;
  leadInstrument?: string;
  counterInstrument?: string;
  fileName: string;
  durationMs: number;
  loopStartMs: number;
  loopEndMs: number;
  loopDurationMs: number;
}

export interface SeedTransition {
  id: string;
  from: string;
  to: string;
  fileName: string;
  timing: {
    handleMs: number;
    crossfadeMs: number;
    glueMs: number;
    landMs: number;
  };
  recipeVersion?: string;
}

export const SEED_TRACKS: SeedTrack[] = [
  {
    id: "track-a",
    name: "Soul Rhodes & Piano",
    bpm: 86,
    key: "G minor",
    genre: "Soul",
    leadInstrument: "Rhodes Piano",
    counterInstrument: "Low-Note Piano",
    fileName: "track-a-soul-rhodes.m4a",
    durationMs: 61395,
    loopStartMs: 8372,
    loopEndMs: 50233,
    loopDurationMs: 41861,
  },
  {
    id: "track-b",
    name: "Jazz Flute & Vibraphone",
    bpm: 86,
    key: "C Dorian",
    genre: "Jazz",
    leadInstrument: "Jazz Flute",
    counterInstrument: "Vibraphone",
    fileName: "track-b-jazz-flute.m4a",
    durationMs: 66976,
    loopStartMs: 16743,
    loopEndMs: 55814,
    loopDurationMs: 39071,
  },
  {
    id: "track-c",
    name: "Soul Trumpet & Saxophone",
    bpm: 94,
    key: "G minor",
    genre: "Soul",
    leadInstrument: "Muted Trumpet",
    counterInstrument: "Tenor Saxophone",
    fileName: "track-c-soul-trumpet.m4a",
    durationMs: 51064,
    loopStartMs: 10213,
    loopEndMs: 45958,
    loopDurationMs: 35745,
  },
];

export const SEED_TRANSITIONS: SeedTransition[] = [
  {
    id: "track-a-to-track-b",
    from: "track-a",
    to: "track-b",
    fileName: "track-a-to-track-b.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7206.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-b-to-track-a",
    from: "track-b",
    to: "track-a",
    fileName: "track-b-to-track-a.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7506.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-a-to-track-c",
    from: "track-a",
    to: "track-c",
    fileName: "track-a-to-track-c.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7605.3, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-c-to-track-a",
    from: "track-c",
    to: "track-a",
    fileName: "track-c-to-track-a.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 11002.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-b-to-track-c",
    from: "track-b",
    to: "track-c",
    fileName: "track-b-to-track-c.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7508, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-c-to-track-b",
    from: "track-c",
    to: "track-b",
    fileName: "track-c-to-track-b.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 6001.3, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
];

async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  storagePath: string,
  localFilePath: string,
) {
  const fileBuffer = fs.readFileSync(localFilePath);
  const { error } = await client.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: "audio/mp4",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${localFilePath} to ${storagePath}: ${error.message}`,
    );
  }
}

export async function ensureAudioBucket(client: SupabaseClient) {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "audio");
  if (!exists) {
    await client.storage.createBucket("audio", { public: true });
  }
}

export function resolveAudioSource(
  folder: string,
  fileName: string,
): string | null {
  const m4aPath = path.resolve(`public/audio/${folder}`, fileName);
  if (fs.existsSync(m4aPath)) return m4aPath;
  return null;
}

export async function seedTrack(client: SupabaseClient, track: SeedTrack) {
  const storagePath = `tracks/${track.fileName}`;
  const fileToUpload = resolveAudioSource("tracks", track.fileName);

  if (fileToUpload) {
    await uploadFile(client, "audio", storagePath, fileToUpload);
  }

  const { error } = await client.from("tracks").upsert(
    {
      id: track.id,
      name: track.name,
      bpm: track.bpm,
      key: track.key,
      genre: track.genre,
      lead_instrument: track.leadInstrument,
      counter_instrument: track.counterInstrument,
      duration_ms: track.durationMs,
      loop_start_ms: track.loopStartMs,
      loop_end_ms: track.loopEndMs,
      loop_duration_ms: track.loopDurationMs,
      sections: [],
      audio_path: storagePath,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to upsert track ${track.id}: ${error.message}`);
  }
}

export async function seedTransition(
  client: SupabaseClient,
  transition: SeedTransition,
) {
  const storagePath = `transitions/${transition.fileName}`;
  const fileToUpload = resolveAudioSource("transitions", transition.fileName);

  if (fileToUpload) {
    await uploadFile(client, "audio", storagePath, fileToUpload);
  }

  const { error } = await client.from("transitions").upsert(
    {
      id: transition.id,
      from_track_id: transition.from,
      to_track_id: transition.to,
      timing: transition.timing,
      recipe_version: transition.recipeVersion,
      audio_path: storagePath,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(
      `Failed to upsert transition ${transition.id}: ${error.message}`,
    );
  }
}

export async function seedDatabase(client: SupabaseClient) {
  await ensureAudioBucket(client);
  for (const track of SEED_TRACKS) {
    await seedTrack(client, track);
  }
  for (const transition of SEED_TRANSITIONS) {
    await seedTransition(client, transition);
  }
}

function runCli() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54521";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  seedDatabase(supabase)
    .then(() => {
      console.log("Seeding completed successfully!");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

if (process.argv[1]?.endsWith("seed/cli.ts")) {
  runCli();
}
