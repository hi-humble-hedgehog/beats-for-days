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
        <span className="border border-foreground bg-transparent px-3 py-1 text-xs font-bold tracking-widest text-foreground uppercase">
          24/7 Infinite Generative Boom Bap
        </span>

        <h1 className="text-4xl leading-[0.85] font-bold tracking-tighter text-foreground sm:text-6xl">
          Beats for Days
        </h1>

        <p className="max-w-lg text-base text-muted-foreground">
          Infinite dusty vinyl grooves, locked pocket Rhodes, and 1950s radio
          broadcast handoffs. Press play to initialize the radio deck.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleStartPlayback}
          className="flex items-center gap-3 bg-primary px-8 py-4 text-base font-bold tracking-wider text-primary-foreground uppercase shadow-md transition hover:opacity-90 active:scale-95"
        >
          <span className="text-xl" aria-hidden="true">
            ▶
          </span>{" "}
          Start Radio Stream
        </button>
        <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Unlocks Web Audio • Returning home pauses playback
        </span>
      </div>
    </main>
  );
}
