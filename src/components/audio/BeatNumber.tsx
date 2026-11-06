"use client";

import { useEffect } from "react";
import { BeatNotFoundSlot } from "./BeatNotFoundSlot";
import { formatBeatNumber } from "@/lib/grid/format";
import { extractBeatIdFromPathname } from "@/lib/player/url";
import type { BeatView } from "@/lib/types/beat";
import { useAudioPlayer } from "./AudioPlayerContext";
import { usePosterContext } from "./PosterContext";
import styles from "./BeatNumber.module.css";

export type BeatNumberProps = {
  initialBeat?: BeatView;
  fallbackBeatId?: string;
};

function resolveBeatId(opts: {
  currentId?: string;
  activePathname?: string;
  initialBeatId?: string;
  fallbackBeatId?: string;
}): string | undefined {
  const { currentId, activePathname, initialBeatId, fallbackBeatId } = opts;
  if (currentId) return currentId;
  const activeBeatId = activePathname
    ? extractBeatIdFromPathname(activePathname)
    : null;
  return activeBeatId ?? initialBeatId ?? fallbackBeatId;
}

function isMissingBeat(
  notFoundBeatId: string | null | undefined,
  beatId?: string,
  fallbackBeatId?: string,
): boolean {
  if (!notFoundBeatId) return false;
  return notFoundBeatId === beatId || notFoundBeatId === fallbackBeatId;
}

/**
 * Renders the brutalist track number (#01) in the poster player transport.
 * Hydrates server-provided beat metadata into the audio context on cold load.
 * Reads the active beat and poster geometry to match the dynamic viewport scale.
 *
 * Falls back to the 404 state when the active beat cannot be found in the crate.
 */
export function BeatNumber({ initialBeat, fallbackBeatId }: BeatNumberProps) {
  const { hydrateBeat, current, activePathname, notFoundBeatId } =
    useAudioPlayer();
  const poster = usePosterContext();

  useEffect(() => {
    if (initialBeat) {
      hydrateBeat?.(initialBeat);
    }
  }, [hydrateBeat, initialBeat]);

  const beatId = resolveBeatId({
    currentId: current?.id,
    activePathname,
    initialBeatId: initialBeat?.id,
    fallbackBeatId,
  });

  if (isMissingBeat(notFoundBeatId, beatId, fallbackBeatId)) {
    return <BeatNotFoundSlot />;
  }

  const hasBeat = Boolean(beatId);
  const number = beatId ? formatBeatNumber(beatId) : "";
  const fontSize = poster?.geometry.numberSize ?? 120;

  return (
    <p
      className={styles.trackNumber}
      style={{ fontSize, minHeight: "0.78em" }}
      aria-label={
        hasBeat ? `Now playing beat number ${number}` : "Loading beat"
      }
      aria-busy={!hasBeat}
    >
      {hasBeat ? (
        <span key={number} className={styles.animated}>
          <span className={styles.accent}>#</span>
          {number}
        </span>
      ) : (
        <span className={styles.placeholder} aria-hidden="true">
          <span className={styles.accent}>#</span>
          00
        </span>
      )}
    </p>
  );
}
