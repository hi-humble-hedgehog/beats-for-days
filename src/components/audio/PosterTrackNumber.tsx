"use client";

import { useAudioPlayer } from "./AudioPlayerContext";
import { usePosterContext } from "./PosterContext";
import { formatBeatNumber } from "@/lib/grid/format";

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
      className="w-full text-right text-[clamp(6.5rem,15vw,13.714rem)] leading-[0.78] font-bold tracking-[-0.07em] tabular-nums"
      style={{ fontSize, minHeight: "0.78em" }}
      aria-label={
        hasBeat ? `Now playing beat number ${number}` : "Loading beat"
      }
      aria-busy={!hasBeat}
    >
      {hasBeat ? (
        <span key={number} className="animate-track-number inline-block">
          <span className="text-primary">#</span>
          {number}
        </span>
      ) : (
        <span className="invisible select-none" aria-hidden="true">
          <span className="text-primary">#</span>
          00
        </span>
      )}
    </p>
  );
}
