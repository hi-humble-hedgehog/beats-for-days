"use client";

import { useStartPlayback } from "@/components/audio/AudioPlayerContext";

/**
 * 404 Not Found page for unknown routes and missing beat IDs.
 * Pauses active playback like the landing page and lets visitors resume or start the next beat.
 */
export default function NotFound() {
  const handleStartPlayback = useStartPlayback();

  return (
    /* A11Y-PLAN:
     * 1. Landmarks: <main> inside RootLayout (<header>, <aside aria-label="Persistent Audio Player">)
     * 2. Headings: single <h1> "404 — Beat Not Found"
     * 3. Controls: native <button type="button"> "▶ Start Radio Stream" with browser :focus-visible
     * 4. Contrast: uses verified semantic tokens (--foreground, --muted-foreground, --primary)
     */
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="border border-foreground bg-transparent px-3 py-1 text-xs font-bold tracking-widest text-foreground uppercase">
          Paused
        </span>

        <h1 className="text-4xl leading-[0.85] font-bold tracking-tighter text-foreground sm:text-6xl">
          <span className="font-black text-primary">#</span>
          404 — Beat Not Found
        </h1>

        <p className="max-w-md text-xs font-bold tracking-widest text-muted-foreground uppercase">
          That beat is not in the crate. Press play to resume your paused beat
          or start the next track.
        </p>
      </div>

      <button
        type="button"
        onClick={handleStartPlayback}
        className="bg-primary px-8 py-4 text-sm font-bold tracking-wider text-primary-foreground uppercase shadow-md transition hover:opacity-90"
      >
        ▶ Start Radio Stream
      </button>
    </main>
  );
}
