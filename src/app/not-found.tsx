"use client";

import { BeatNotFoundSlot } from "@/components/audio/BeatNotFoundSlot";

/**
 * 404 Not Found page for unknown routes and missing beat IDs.
 * Lives directly inside the poster player slot, matching About and Privacy.
 */
export default function NotFound() {
  return <BeatNotFoundSlot />;
}
