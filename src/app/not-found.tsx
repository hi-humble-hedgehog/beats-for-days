"use client";

import { InfoPage } from "@/components/grid/InfoPage";
import { useStartPlayback } from "@/components/audio/useStartPlayback";

/**
 * 404 Not Found page for unknown routes and missing beat IDs.
 * Pauses active playback like the landing page and lets visitors resume or start the next beat.
 */
export default function NotFound() {
  const handleStartPlayback = useStartPlayback();

  return (
    <InfoPage section="not-found" title="404 — Beat Not Found">
      <p className="max-w-md text-xs font-bold tracking-widest text-muted-foreground uppercase">
        That beat is not in the crate. Press play to resume your paused beat or
        start the next track.
      </p>
      <button
        type="button"
        onClick={handleStartPlayback}
        className="bg-primary px-8 py-4 text-sm font-bold tracking-wider text-primary-foreground uppercase shadow-md transition hover:opacity-90"
      >
        ▶ Start Radio Stream
      </button>
    </InfoPage>
  );
}
