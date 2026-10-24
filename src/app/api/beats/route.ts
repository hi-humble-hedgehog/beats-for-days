import { NextResponse } from "next/server";
import { fetchBeatViews } from "@/lib/tracks";

/**
 * Route handler delivering the raw beat catalog.
 *
 * Rationale:
 * Provides catalog access for landing pages or tools.
 * Note: Dynamic playback resolution is handled on demand by `/api/beats/next` (ADR 0010).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "0", 10);

  const allBeats = await fetchBeatViews();
  const beats = rawLimit > 0 ? allBeats.slice(0, rawLimit) : allBeats;

  return NextResponse.json({
    beats,
    total: allBeats.length,
  });
}
