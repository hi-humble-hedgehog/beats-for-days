import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { resolveNextBeat } from "@/lib/player/graph";
import { fetchBeatViews } from "@/lib/tracks";

interface NextBeatRequestBody {
  currentTrackId?: string;
  playedTrackIds?: string[];
  mode?: "auto" | "skip";
}

async function parseRequestBody(
  request: Request,
): Promise<NextBeatRequestBody> {
  try {
    return (await request.json()) as NextBeatRequestBody;
  } catch {
    return {};
  }
}

/**
 * Route handler resolving the next beat via transition graph and listening history.
 *
 * Rationale:
 * Eliminates full-catalog downloads by delivering tracks on demand. Evaluates the
 * 3-step transition graph policy from ADR 0009 using the client's listening history,
 * keeping the player lightweight and edge-ready without tracking cookies (ADR 0008, ADR 0010).
 */
export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const allBeats = await fetchBeatViews();

  const result = resolveNextBeat({
    currentTrackId: body.currentTrackId,
    playedTrackIds: body.playedTrackIds ?? [],
    allTracks: allBeats,
    mode: body.mode ?? "auto",
  });

  if (!result) {
    return NextResponse.json({ error: "No beats available" }, { status: 404 });
  }

  return NextResponse.json({
    ...result,
    resolveAfterSec: getServerEnv().AUTO_TRANSITION_RESOLVE_SECONDS,
  });
}

/**
 * Cold-start route handler returning an initial beat without history.
 */
export async function GET(_request?: Request) {
  const allBeats = await fetchBeatViews();
  const result = resolveNextBeat({
    playedTrackIds: [],
    allTracks: allBeats,
    mode: "skip",
  });

  if (!result) {
    return NextResponse.json({ error: "No beats available" }, { status: 404 });
  }

  return NextResponse.json({
    ...result,
    resolveAfterSec: getServerEnv().AUTO_TRANSITION_RESOLVE_SECONDS,
  });
}
