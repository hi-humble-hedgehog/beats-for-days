"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import NotFound from "@/app/not-found";
import { PosterTrackNumber } from "@/components/audio/PosterTrackNumber";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { extractBeatIdFromPathname } from "@/lib/player/url";
import type { BeatView } from "@/lib/types/beat";

function resolveActiveSlug(
  activePathname: string | undefined,
  pathname: string,
  paramSlug: string | undefined,
): string {
  return (
    extractBeatIdFromPathname(activePathname ?? pathname) ?? paramSlug ?? "—"
  );
}

export function BeatDeck({ initialBeat }: { initialBeat?: BeatView }) {
  const params = useParams<{ slug: string }>();
  const pathname = usePathname();
  const { activePathname, notFoundBeatId, hydrateBeat } = useAudioPlayer();

  useEffect(() => {
    if (initialBeat) {
      hydrateBeat?.(initialBeat);
    }
  }, [hydrateBeat, initialBeat]);

  const slug = resolveActiveSlug(activePathname, pathname, params?.slug);

  if (notFoundBeatId && notFoundBeatId === slug) {
    return <NotFound />;
  }

  return <PosterTrackNumber fallbackBeatId={slug} />;
}
