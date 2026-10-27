"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GridOverlay } from "@/components/grid/GridOverlay";
import { SpectrumBars } from "@/components/grid/SpectrumBars";
import { VinylVisualizer } from "@/components/grid/VinylVisualizer";
import { usePosterGeometry } from "@/components/grid/usePosterGeometry";
import { ROUTES } from "@/lib/constants";
import { formatBeatNumber, seedFromBeatId } from "@/lib/grid/format";
import type { Geometry } from "@/lib/grid/poster-geometry";
import { resolvePosterShortcut } from "@/lib/player/shortcuts";
import { extractBeatIdFromPathname, formatBeatUrl } from "@/lib/player/url";
import type { AudioPlayerState } from "@/lib/types/audio";
import { useAudioPlayer } from "./AudioPlayerContext";
import { PosterContext } from "./PosterContext";
import { PosterInfoSlot, type PosterInfoSection } from "./PosterInfoSlot";
import { PosterTrackNumber } from "./PosterTrackNumber";
import { TransportControls } from "./TransportControls";
import { useStartPlayback } from "./useStartPlayback";

function usePosterShortcuts(opts: {
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const { onToggle, onNext, onPrevious } = opts;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = resolvePosterShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        target: event.target,
      });
      if (!action) return;
      if (action === "toggle") event.preventDefault();
      const run = {
        toggle: onToggle,
        previous: onPrevious,
        next: onNext,
      };
      run[action]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrevious, onToggle]);
}

function PosterHeader({ geometry }: { geometry: Geometry }) {
  return (
    <header
      className="absolute z-20 flex flex-col gap-3"
      style={{ left: geometry.margin, top: geometry.margin }}
    >
      <h1 className="text-3xl leading-[0.85] font-bold tracking-tighter md:text-5xl">
        Beats
        <br />
        for Days
      </h1>
      <p className="hidden text-sm leading-snug font-medium md:block">
        Infinite instrumental series
        <br />
        <span className="text-muted-foreground">
          Unreleased. Unnamed. Unending.
        </span>
      </p>
    </header>
  );
}

function PosterTransport(opts: {
  geometry: Geometry;
  player: AudioPlayerState;
  showGrid: boolean;
  activeSection?: PosterInfoSection;
  returnHref: string;
  fallbackBeatId?: string;
  children?: ReactNode;
  onToggle: () => void;
  onToggleGrid: () => void;
}) {
  const {
    geometry,
    player,
    showGrid,
    activeSection,
    returnHref,
    fallbackBeatId,
    children,
    onToggle,
    onToggleGrid,
  } = opts;
  return (
    <section
      className="absolute z-20 flex flex-col justify-end gap-2 md:gap-4"
      style={{
        left: geometry.px + geometry.gap / 2,
        top: geometry.py + geometry.gap / 2,
        right: geometry.margin,
        bottom: geometry.margin,
      }}
      aria-label="Player"
    >
      <div
        className={`flex w-full justify-end ${geometry.mobile ? "" : "max-w-sm"}`}
      >
        {children ? (
          children
        ) : activeSection ? (
          <PosterInfoSlot section={activeSection} returnHref={returnHref} />
        ) : (
          <PosterTrackNumber fallbackBeatId={fallbackBeatId} />
        )}
        <p className="sr-only" aria-live="polite">
          {player.isPlaying ? "On air" : "Paused"}
        </p>
      </div>
      <div className={geometry.mobile ? "w-full" : "w-full max-w-sm"}>
        <TransportControls
          isPlaying={player.isPlaying}
          muted={player.muted ?? false}
          showGrid={showGrid}
          activeSection={activeSection}
          returnHref={returnHref}
          onToggle={onToggle}
          onNext={() =>
            player.skip ? player.skip() : player.advanceTrack("skip")
          }
          onPrevious={() => player.previous?.()}
          onToggleMute={() => player.toggleMute?.()}
          onToggleGrid={onToggleGrid}
        />
      </div>
    </section>
  );
}

function resolveActiveSection(
  infoSection: PosterInfoSection | undefined,
  pathname: string,
): PosterInfoSection | undefined {
  if (infoSection) return infoSection;
  if (pathname === ROUTES.ABOUT) return "about";
  if (pathname === ROUTES.PRIVACY) return "privacy";
  return undefined;
}

function resolvePosterReturnHref(
  currentId?: string,
  effectiveBeatId?: string,
): string {
  const target = currentId ?? effectiveBeatId;
  return target ? formatBeatUrl(target) : ROUTES.HOME;
}

function resolvePosterBeatId(
  player: AudioPlayerState,
  fallbackBeatId?: string,
): string {
  return player.current?.id ?? player.notFoundBeatId ?? fallbackBeatId ?? "00";
}

/**
 * Full-screen Tonhalle poster player shell shared by `/`, `/beat/[slug]`, `/about`, and `/privacy`.
 */
export function PosterPlayer({
  startOnPlay = false,
  fallbackBeatId,
  infoSection,
  children,
}: {
  startOnPlay?: boolean;
  fallbackBeatId?: string;
  infoSection?: PosterInfoSection;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const activeSection = resolveActiveSection(infoSection, pathname);
  const player = useAudioPlayer();
  const startPlayback = useStartPlayback();
  const routeBeatId = extractBeatIdFromPathname(pathname) ?? undefined;
  const effectiveBeatId = fallbackBeatId ?? routeBeatId;
  const beatId = resolvePosterBeatId(player, effectiveBeatId);
  const returnHref = resolvePosterReturnHref(
    player.current?.id,
    effectiveBeatId,
  );
  const [mainRef, geometry] = usePosterGeometry<HTMLDivElement>(
    seedFromBeatId(beatId),
  );
  const [showGrid, setShowGrid] = useState(false);
  const number = formatBeatNumber(beatId);
  const togglePlayback = () => {
    if (startOnPlay && !player.isPlaying) {
      startPlayback();
      return;
    }
    player.togglePlay();
  };

  usePosterShortcuts({
    onToggle: togglePlayback,
    onNext: () => (player.skip ? player.skip() : player.advanceTrack("skip")),
    onPrevious: () => player.previous?.(),
  });

  return (
    /* A11Y-PLAN
      1. Landmarks: measuring wrapper; <header> banner (sibling of main so it
         maps to banner); <main> poster stage; <section aria-label="Player">;
         <nav aria-label="Information"> inside transport
      2. Headings: single <h1> "Beats for Days"
      3. Controls: Previous/Play/Pause/Next/Mute/Grid buttons; info links
      4. Contrast: --foreground/--primary/--muted-foreground on --sleeve (verified tokens)
    */
    <PosterContext.Provider value={{ geometry, number, returnHref }}>
      <div
        ref={mainRef}
        className="relative h-dvh min-h-[600px] overflow-hidden bg-background"
      >
        <PosterHeader geometry={geometry} />
        <main className="absolute inset-0">
          <SpectrumBars geometry={geometry} />
          <VinylVisualizer geometry={geometry} />
          <PosterTransport
            geometry={geometry}
            player={player}
            showGrid={showGrid}
            activeSection={activeSection}
            returnHref={returnHref}
            fallbackBeatId={effectiveBeatId}
            onToggle={togglePlayback}
            onToggleGrid={() => setShowGrid((value) => !value)}
          >
            {children}
          </PosterTransport>
          {showGrid ? <GridOverlay geometry={geometry} /> : null}
        </main>
      </div>
    </PosterContext.Provider>
  );
}
