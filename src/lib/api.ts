import { API_ROUTES } from "./constants";
import type { BeatView, TransitionView } from "./types/beat";

export interface GetBeatsResponse {
  beats: BeatView[];
  total: number;
}

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

export interface WaitlistStatsResponse {
  total: number;
  claimed: number;
  remaining: number;
}

export interface JoinWaitlistResponse {
  success: boolean;
  message?: string;
  error?: string;
  remaining?: number;
}

export const beatsApi = {
  /**
   * Loads the beat catalog from `/api/beats`.
   * Keeps database queries on the server so the browser only gets ready-to-play URLs.
   */
  async getBeats(): Promise<GetBeatsResponse> {
    const res = await fetch(API_ROUTES.BEATS);
    if (!res.ok) {
      throw new Error(`Failed to load beats: ${res.statusText}`);
    }
    return res.json();
  },

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
};

export const waitlistApi = {
  /**
   * Loads the current waitlist invite counts from `/api/waitlist`.
   */
  async getStats(): Promise<WaitlistStatsResponse> {
    const res = await fetch(API_ROUTES.WAITLIST);
    if (!res.ok) {
      throw new Error(`Failed to load waitlist metrics: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Sends the user's email and timezone to `/api/waitlist` to join the waitlist.
   */
  async joinWaitlist(payload: {
    email: string;
    timezone?: string;
  }): Promise<JoinWaitlistResponse> {
    const res = await fetch(API_ROUTES.WAITLIST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
