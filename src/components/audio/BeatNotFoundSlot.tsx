"use client";

import { PosterInfoSlot } from "./PosterInfoSlot";

/**
 * Editorial message displayed in the poster slot when a beat is missing.
 * Matches About and Privacy styling and informs the listener how to recover.
 */
export function BeatNotFoundSlot() {
  return (
    <PosterInfoSlot title="404 — Beat Not Found">
      <p>
        That beat is not in the crate. Press play to resume your paused beat or
        start the next track.
      </p>
    </PosterInfoSlot>
  );
}
