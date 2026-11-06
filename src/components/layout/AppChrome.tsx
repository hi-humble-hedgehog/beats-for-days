"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { PosterPlayer } from "@/components/audio/PosterPlayer";
import { shouldShowPosterPlayer } from "@/lib/player/chrome";
import { shouldResolveStartOnPlay } from "@/lib/player/decisions";

/**
 * Route chrome for the application.
 * Keeps the full-screen Swiss poster player and canvas visualizers mounted
 * across all public routes (`/`, `/beat/*`, `/about`, `/privacy`, and 404s)
 * so route changes never flash or re-initialize the canvas.
 * Isolates local admin management routes so they render without the consumer player shell.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isPlaying, current, notFoundBeatId } = useAudioPlayer();

  if (!shouldShowPosterPlayer(pathname)) {
    return <>{children}</>;
  }

  const startOnPlay = shouldResolveStartOnPlay(
    isPlaying,
    pathname ?? "",
    current,
    notFoundBeatId,
  );

  return <PosterPlayer startOnPlay={startOnPlay}>{children}</PosterPlayer>;
}
