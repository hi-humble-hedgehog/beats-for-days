import { API_ROUTES } from "./constants";
import type { BeatView, TransitionView } from "./types/beat";

export interface NextBeatRequest {
  currentTrackId?: string;
  playedTrackIds?: string[];
  mode?: "auto" | "skip";
}

export interface NextBeatResponse {
  beat: BeatView;
  transition: TransitionView | null;
  resolveAfterSec?: number;
}

export const beatsApi = {
  /**
   * Resolves the next beat from `/api/beats/next` using the client's listening history.
   * Keeps track selection and graph traversal on the server so the browser only gets the active beat.
   */
  async getNextBeat(payload: NextBeatRequest = {}): Promise<NextBeatResponse> {
    const res = await fetch(API_ROUTES.BEATS_NEXT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to resolve next beat: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetches a specific beat by ID from `/api/beats?id=...`.
   * Returns `null` when the requested track ID is not found.
   */
  async getBeat(id: string): Promise<BeatView | null> {
    const res = await fetch(`${API_ROUTES.BEATS}?id=${encodeURIComponent(id)}`);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to load beat: ${res.statusText}`);
    }
    const data = (await res.json()) as { beat: BeatView };
    return data.beat;
  },
};
