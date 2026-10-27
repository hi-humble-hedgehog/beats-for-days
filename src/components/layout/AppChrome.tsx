"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PersistentPlayerBar } from "@/components/audio/PersistentPlayerBar";
import { PosterPlayer } from "@/components/audio/PosterPlayer";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { HeaderNav } from "@/components/navigation/HeaderNav";
import {
  shouldShowHeaderNav,
  shouldShowPersistentPlayerBar,
} from "@/lib/player/chrome";

/**
 * Route chrome for the Swiss poster and editorial layouts.
 * Keeps the full-screen poster player and its canvas visualizers mounted
 * across all poster routes (`/`, `/beat/*`, `/about`, `/privacy`) so route
 * changes never flash or re-initialize the canvas.
 * Switches to the editorial chrome with the persistent player bar on 404
 * pages and missing-beat routes.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { notFoundBeatId } = useAudioPlayer();
  const showNav = shouldShowHeaderNav(pathname);
  const showBar = shouldShowPersistentPlayerBar(pathname, notFoundBeatId);

  if (!showBar) {
    return (
      <PosterPlayer startOnPlay={pathname === "/"}>{children}</PosterPlayer>
    );
  }

  return (
    <>
      {showNav ? <HeaderNav /> : null}
      <div className="flex min-h-full flex-1 flex-col pb-24">{children}</div>
      <PersistentPlayerBar />
    </>
  );
}
