import { NextResponse } from "next/server";
import { fetchBeatViews, fetchBeatViewById } from "@/lib/tracks";

/**
 * Route handler delivering the raw beat catalog or a single beat by ID.
 *
 * Rationale:
 * Delivers either the full catalog or single track views on demand (ADR 0010, ADR 0013).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const beat = await fetchBeatViewById(id);
    if (!beat) {
      return NextResponse.json({ error: "Beat not found" }, { status: 404 });
    }
    return NextResponse.json({ beat });
  }

  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "0", 10);

  const allBeats = await fetchBeatViews();
  const beats = rawLimit > 0 ? allBeats.slice(0, rawLimit) : allBeats;

  return NextResponse.json({
    beats,
    total: allBeats.length,
  });
}
