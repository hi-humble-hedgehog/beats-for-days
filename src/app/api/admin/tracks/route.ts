import { NextResponse } from "next/server";
import {
  createTrackSchema,
  createAdminTrack,
  fetchAdminTracks,
  uploadTrackAudio,
} from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isLocalDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Returns all catalog tracks for the admin dashboard.
 * Blocked in production to enforce local-only access (ADR 0016).
 */
export async function GET(): Promise<NextResponse> {
  if (!isLocalDev()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const client = getSupabaseAdminClient();
    const tracks = await fetchAdminTracks(client);
    return NextResponse.json({ tracks });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Accepts multipart audio upload and metadata to create a new track.
 * Blocked in production to enforce local-only access (ADR 0016).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isLocalDev()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    const rawData = {
      id: formData.get("id"),
      name: formData.get("name"),
      index: formData.get("index") || undefined,
      bpm: formData.get("bpm"),
      key: formData.get("key"),
      genre: formData.get("genre"),
      lead_instrument: formData.get("lead_instrument") || undefined,
      counter_instrument: formData.get("counter_instrument") || undefined,
      duration_ms: formData.get("duration_ms"),
      loop_start_ms: formData.get("loop_start_ms"),
      loop_end_ms: formData.get("loop_end_ms"),
    };

    const validated = createTrackSchema.parse(rawData);
    const storagePath = `tracks/${validated.id}.m4a`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const client = getSupabaseAdminClient();
    await uploadTrackAudio(client, storagePath, buffer);

    const track = await createAdminTrack(client, {
      ...validated,
      audio_path: storagePath,
    });

    return NextResponse.json({ track }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
