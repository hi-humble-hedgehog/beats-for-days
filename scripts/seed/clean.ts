import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes all existing transition and track records from the database.
 * Deletes transitions first to satisfy foreign key constraints.
 */
export async function cleanDatabase(client: SupabaseClient): Promise<void> {
  const { error: trError } = await client
    .from("transitions")
    .delete()
    .neq("id", "");
  if (trError) {
    throw new Error(`Failed to clean transitions table: ${trError.message}`);
  }

  const { error: trackError } = await client
    .from("tracks")
    .delete()
    .neq("id", "");
  if (trackError) {
    throw new Error(`Failed to clean tracks table: ${trackError.message}`);
  }
}

async function removeFilesFromFolder(
  client: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<void> {
  const { data: files } = await client.storage
    .from(bucket)
    .list(folder, { limit: 1000 });
  if (files && files.length > 0) {
    const paths = files
      .filter((f) => f.name && f.name !== ".emptyFolderPlaceholder")
      .map((f) => `${folder}/${f.name}`);
    if (paths.length > 0) {
      await client.storage.from(bucket).remove(paths);
    }
  }
}

/**
 * Deletes all audio assets from the storage bucket to guarantee a clean slate.
 */
export async function cleanStorageBucket(
  client: SupabaseClient,
  bucket = "audio",
): Promise<void> {
  if (!client.storage) return;
  for (const folder of ["tracks", "transitions"]) {
    await removeFilesFromFolder(client, bucket, folder);
  }
}
