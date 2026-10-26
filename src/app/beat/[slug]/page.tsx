import { notFound } from "next/navigation";
import { fetchBeatViewById } from "@/lib/tracks";
import { BeatDeck } from "./BeatDeck";

export const instant = false;

export default async function BeatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const beat = await fetchBeatViewById(slug);
  if (!beat) {
    notFound();
  }

  return <BeatDeck initialBeat={beat} />;
}
