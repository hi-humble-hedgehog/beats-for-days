import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadCatalogFromPath,
  resolveCatalog,
  resolveSeedData,
  type SeedOptions,
} from "./catalog";
import { cleanDatabase, cleanStorageBucket } from "./clean";
import { loadSeedEnv } from "./env";
import {
  type SeedTrack,
  type SeedTransition,
  SEED_TRACKS,
  SEED_TRANSITIONS,
} from "./fixtures";

export type { SeedTrack, SeedTransition, SeedOptions };
export {
  SEED_TRACKS,
  SEED_TRANSITIONS,
  cleanDatabase,
  cleanStorageBucket,
  loadCatalogFromPath,
  resolveCatalog,
};

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

async function uploadAudioIfPresent(
  client: SupabaseClient,
  folder: string,
  fileName: string,
  skipStorageUpload: boolean,
): Promise<void> {
  if (skipStorageUpload || !client.storage) return;
  const localFile = resolveAudioSource(folder, fileName);
  if (!localFile) return;

  try {
    await uploadFile(client, "audio", `${folder}/${fileName}`, localFile);
  } catch (err) {
    console.warn(
      `Warning: failed to upload storage asset ${folder}/${fileName}: ${(err as Error).message}`,
    );
  }
}

export async function seedTrack(
  client: SupabaseClient,
  track: SeedTrack,
  skipStorageUpload = false,
) {
  const storagePath = `tracks/${track.fileName}`;
  await uploadAudioIfPresent(
    client,
    "tracks",
    track.fileName,
    skipStorageUpload,
  );

  const payload: Record<string, unknown> = {
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
    is_active: track.isActive ?? true,
  };
  if (track.index !== undefined) {
    payload.index = track.index;
  }

  let { error } = await client
    .from("tracks")
    .upsert(payload, { onConflict: "id" });

  if (error && error.message.includes("index")) {
    delete payload.index;
    const retry = await client
      .from("tracks")
      .upsert(payload, { onConflict: "id" });
    error = retry.error;
  }

  if (error) {
    throw new Error(`Failed to upsert track ${track.id}: ${error.message}`);
  }
}

export async function seedTransition(
  client: SupabaseClient,
  transition: SeedTransition,
  skipStorageUpload = false,
) {
  const storagePath = `transitions/${transition.fileName}`;
  await uploadAudioIfPresent(
    client,
    "transitions",
    transition.fileName,
    skipStorageUpload,
  );

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

async function tryEnsureBucket(
  client: SupabaseClient,
  skip: boolean,
): Promise<void> {
  if (skip || !client.storage) return;
  try {
    await ensureAudioBucket(client);
  } catch (err) {
    console.warn(
      `Warning: failed to ensure audio bucket: ${(err as Error).message}`,
    );
  }
}

export async function seedDatabase(
  client: SupabaseClient,
  options?: SeedOptions,
) {
  const skipUpload = Boolean(options?.skipStorageUpload);
  await tryEnsureBucket(client, skipUpload);

  if (options?.clean) {
    if (!skipUpload) {
      await cleanStorageBucket(client);
    }
    await cleanDatabase(client);
  }

  const { tracks, transitions } = resolveSeedData(options);

  for (const track of tracks) {
    await seedTrack(client, track, skipUpload);
  }
  for (const transition of transitions) {
    await seedTransition(client, transition, skipUpload);
  }
}

function resolveSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54521";
}

function resolveSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
  );
}

function warnIfMissingServiceRoleKey(): void {
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ) {
    console.warn(
      "Notice: SUPABASE_SERVICE_ROLE_KEY is not set. Storage uploads with anon key may fail unless RLS upload policies are configured.",
    );
  }
}

function runCli() {
  loadSeedEnv();

  const customCatalog = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"));
  const skipStorageUpload = process.argv.includes("--skip-storage");
  const clean = process.argv.includes("--clean");
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseKey();
  warnIfMissingServiceRoleKey();

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { tracks, transitions } = resolveCatalog(customCatalog);
  if (clean) {
    console.log(
      "Clean slate requested: removing old tracks, transitions, and storage assets...",
    );
  }
  console.log(
    `Seeding database with ${tracks.length} tracks and ${transitions.length} transitions...`,
  );

  seedDatabase(supabase, { tracks, transitions, skipStorageUpload, clean })
    .then(() => {
      console.log(
        `Seeding completed successfully with ${tracks.length} tracks and ${transitions.length} transitions!`,
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

if (process.argv[1]?.endsWith("seed/cli.ts")) {
  runCli();
}
