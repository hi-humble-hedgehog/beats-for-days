import { NextResponse } from "next/server";
import { updateAdminTrack, updateTrackSchema } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isLocalDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Updates an existing track's metadata or toggles its active status.
 * Blocked in production to enforce local-only access (ADR 0016).
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  if (!isLocalDev()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateTrackSchema.parse(body);

    const client = getSupabaseAdminClient();
    const track = await updateAdminTrack(client, id, validated);

    return NextResponse.json({ track });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
