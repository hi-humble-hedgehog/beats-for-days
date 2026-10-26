import { NextResponse } from "next/server";
import { fetchBeatViewById } from "@/lib/tracks";

/**
 * Route handler delivering a single beat by ID (`GET /api/beats?id=:id`).
 *
 * Rationale:
 * Cold loads and history jumps need one beat, not the catalog (ADR 0013).
 * Next-beat resolution lives in `/api/beats/next` (ADR 0010), so the
 * full-catalog response is retired.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing beat id" }, { status: 400 });
  }

  const beat = await fetchBeatViewById(id);
  if (!beat) {
    return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  }
  return NextResponse.json({ beat });
}
