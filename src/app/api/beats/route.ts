import { NextResponse } from "next/server";
import { epochShuffle } from "@/lib/player/shuffle";
import { fetchBeatViews } from "@/lib/tracks";

function generateOrderHash(): string {
  return `seed_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderHash = url.searchParams.get("order_hash") || generateOrderHash();
  const rawCycle = Number.parseInt(url.searchParams.get("cycle") || "1", 10);
  const cycle = Number.isNaN(rawCycle) || rawCycle < 1 ? 1 : rawCycle;

  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit;

  const startingBeat = url.searchParams.get("starting_beat") || undefined;

  const allBeats = await fetchBeatViews();
  const shuffled = epochShuffle(allBeats, orderHash, cycle, startingBeat);
  const beats = shuffled.slice(0, limit);

  return NextResponse.json({
    orderHash,
    cycle,
    beats,
    total: allBeats.length,
  });
}
