"use client";

import { useParams } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";

export default function BeatPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "—";
  const { current, isPlaying, togglePlay, advanceTrack, secondsRemaining } =
    useAudioPlayer();

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
          Dummy Beats
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-6xl">
          {current?.name ?? `Loading Beat ${slug}...`}
        </h1>

        <p className="max-w-md font-mono text-sm text-zinc-400">
          Track ID: {current?.id ?? slug}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full bg-amber-500 px-8 py-3.5 text-base font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {isPlaying ? "⏸ Pause Beat" : "▶ Play Beat"}
        </button>

        <button
          type="button"
          onClick={advanceTrack}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-base font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white focus-visible:outline-2 focus-visible:outline-zinc-400"
        >
          ⏭ Next Beat
        </button>
      </div>

      <p className="font-mono text-xs text-zinc-500">
        Automatic seamless AI transition queued in {secondsRemaining}s
      </p>
    </main>
  );
}
