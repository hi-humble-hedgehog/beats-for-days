import { notFound } from "next/navigation";
import { BeatNumber } from "@/components/audio/BeatNumber";
import { fetchBeatViewById } from "@/lib/tracks";

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

  return <BeatNumber initialBeat={beat} fallbackBeatId={slug} />;
}
