"use client";

import { useParams, usePathname } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { extractBeatIdFromPathname } from "@/lib/player/url";

function getBeatDisplayInfo(
  slug: string,
  currentName?: string,
  currentId?: string,
) {
  const isMatched = slug === "—" || currentId === slug;
  return {
    beatName: isMatched ? currentName : undefined,
    trackId: isMatched ? (currentId ?? slug) : slug,
  };
}

export default function BeatPage() {
  const params = useParams<{ slug: string }>();
  const pathname = usePathname();
  const slug = extractBeatIdFromPathname(pathname) ?? params?.slug ?? "—";
  const { current, isPlaying, togglePlay, advanceTrack, secondsRemaining } =
    useAudioPlayer();

  const { beatName, trackId } = getBeatDisplayInfo(
    slug,
    current?.name,
    current?.id,
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="border border-primary px-3 py-1 text-xs font-bold tracking-widest text-primary uppercase">
          {isPlaying ? "Playing" : "Paused"}
        </span>

        <h1 className="text-4xl leading-[0.85] font-bold tracking-tighter text-foreground sm:text-6xl">
          <span className="font-black text-primary">#</span>
          {beatName ?? `Loading Beat ${slug}...`}
        </h1>

        <p className="max-w-md text-xs font-bold tracking-widest text-muted-foreground uppercase tabular-nums">
          Track ID: {trackId}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="bg-primary px-6 py-3 text-sm font-bold tracking-wider text-primary-foreground uppercase shadow-md transition hover:opacity-90"
        >
          {isPlaying ? "⏸ Pause Beat" : "▶ Play Beat"}
        </button>

        <button
          type="button"
          onClick={advanceTrack}
          className="border border-foreground bg-transparent px-6 py-3 text-sm font-bold tracking-wider text-foreground uppercase transition hover:bg-foreground hover:text-background"
        >
          ⏭ Next Beat
        </button>
      </div>

      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase tabular-nums">
        Automatic seamless AI transition queued in {secondsRemaining}s
      </p>
    </main>
  );
}
