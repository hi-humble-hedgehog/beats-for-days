"use client";

import { useRouter } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";

export default function Home() {
  const router = useRouter();
  const { current, isPlaying, togglePlay } = useAudioPlayer();

  const handleStartPlayback = () => {
    if (!isPlaying) {
      togglePlay();
    }
    const targetBeat = current?.id ?? "0001";
    router.push(`/beat/${targetBeat}`);
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-400">
          24/7 Infinite Generative Boom Bap
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-6xl">
          Beats for Days
        </h1>

        <p className="max-w-lg text-base text-zinc-400">
          Infinite dusty vinyl grooves, locked pocket Rhodes, and 1950s radio
          broadcast handoffs. Press play to initialize the radio deck.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleStartPlayback}
          className="flex items-center gap-3 rounded-full bg-amber-500 px-10 py-5 text-lg font-bold text-zinc-950 shadow-2xl shadow-amber-500/25 transition hover:scale-105 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400 active:scale-95"
        >
          <span className="text-2xl" aria-hidden="true">
            ▶
          </span>{" "}
          Start Radio Stream
        </button>
        <span className="font-mono text-xs text-zinc-500">
          Unlocks Web Audio • Returning home pauses playback
        </span>
      </div>
    </main>
  );
}
