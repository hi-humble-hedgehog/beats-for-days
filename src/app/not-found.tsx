"use client";

import { PosterInfoSlot } from "@/components/audio/PosterInfoSlot";

/**
 * 404 Not Found page for unknown routes and missing beat IDs.
 * Lives directly inside the poster player slot, matching About and Privacy.
 */
export default function NotFound() {
  return (
    <PosterInfoSlot title="404 — Beat Not Found">
      <p>
        That beat is not in the crate. Press play to resume your paused beat or
        start the next track.
      </p>
    </PosterInfoSlot>
  );
}
