"use client";

import { useAudioPlayer } from "./AudioPlayerContext";
import { usePosterContext } from "./PosterContext";
import { formatBeatNumber } from "@/lib/grid/format";
import styles from "./PosterTrackNumber.module.css";

type PosterTrackNumberProps = {
  fallbackBeatId?: string;
};

/**
 * Renders the brutalist track number (#01) in the poster player transport.
 * Reads the current beat and active geometry from context to format the number
 * and match the viewport's dynamic typography size.
 *
 * Keeps the track number slot empty while initial beat data resolves on cold load,
 * then animates the resolved number into view with reduced-motion support.
 */
export function PosterTrackNumber({ fallbackBeatId }: PosterTrackNumberProps) {
  const player = useAudioPlayer();
  const poster = usePosterContext();

  const current = player.current;
  const beatId = current?.id ?? player.notFoundBeatId ?? fallbackBeatId;
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
