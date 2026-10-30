import { NextResponse } from "next/server";
import { fetchAdminTrackTransitions } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isLocalDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Returns incoming and outgoing transition clips for auditioning a track.
 * Blocked in production to enforce local-only access (ADR 0016).
 */
export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  if (!isLocalDev()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { id } = await params;
    const client = getSupabaseAdminClient();
    const transitions = await fetchAdminTrackTransitions(client, id);

    return NextResponse.json(transitions);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
