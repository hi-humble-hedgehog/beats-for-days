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
 */
export function PosterTrackNumber({ fallbackBeatId }: PosterTrackNumberProps) {
  const player = useAudioPlayer();
  const poster = usePosterContext();

  const current = player.current;
  const beatId = current?.id ?? player.notFoundBeatId ?? fallbackBeatId ?? "00";
  const number = formatBeatNumber(beatId);
  const fontSize = poster?.geometry.numberSize ?? 120;

  return (
    <p
      className="w-full text-right leading-[0.78] font-bold tracking-[-0.07em] tabular-nums"
      style={{ fontSize }}
      aria-label={`Now playing beat number ${number}`}
    >
      <span className="text-primary">#</span>
      {number}
    </p>
  );
}
