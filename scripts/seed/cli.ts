import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

interface ManifestSection {
  key: string;
  label: string;
  bars: number;
  duration_ms: number;
}

interface ManifestTrack {
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
  sections?: ManifestSection[];
}

interface ManifestTransition {
  id: string;
  from: string;
  to: string;
  fileName: string;
  timing: Record<string, number>;
  recipeVersion?: string;
}

interface Manifest {
  tracks: Record<string, ManifestTrack>;
  transitions: ManifestTransition[];
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54521";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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
      contentType: "audio/wav",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${localFilePath} to ${storagePath}: ${error.message}`,
    );
  }
}

async function ensureAudioBucket(client: SupabaseClient) {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "audio");
  if (!exists) {
    await client.storage.createBucket("audio", { public: true });
  }
}

async function seedTrack(client: SupabaseClient, track: ManifestTrack) {
  const localTrackFile = path.resolve(
    "docs/ui-starter-pack/tracks",
    track.fileName,
  );
  const storagePath = `tracks/${track.fileName}`;

  console.log(`Uploading track ${track.name} (${track.fileName})...`);
  await uploadFile(client, "audio", storagePath, localTrackFile);

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
      sections: track.sections ?? [],
      audio_path: storagePath,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to upsert track ${track.id}: ${error.message}`);
  }
}

async function seedTransition(
  client: SupabaseClient,
  transition: ManifestTransition,
) {
  const localTransitionFile = path.resolve(
    "docs/ui-starter-pack/transitions",
    transition.fileName,
  );
  const storagePath = `transitions/${transition.fileName}`;

  console.log(`Uploading transition ${transition.id}...`);
  await uploadFile(client, "audio", storagePath, localTransitionFile);

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

async function seedTracks(
  client: SupabaseClient,
  tracks: Record<string, ManifestTrack>,
) {
  for (const track of Object.values(tracks)) {
    await seedTrack(client, track);
  }
}

async function seedTransitions(
  client: SupabaseClient,
  transitions: ManifestTransition[],
) {
  for (const transition of transitions) {
    await seedTransition(client, transition);
  }
}

async function seed() {
  const manifestPath = path.resolve("docs/ui-starter-pack/manifest.json");
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  await ensureAudioBucket(supabase);
  await seedTracks(supabase, manifest.tracks);
  await seedTransitions(supabase, manifest.transitions);

  console.log("Seeding completed successfully!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
