import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Loads recent played track IDs from browser local storage.
 * Validates that stored data is an array of strings and safely returns an empty array on the server or on invalid data.
 */
export function loadPlayedHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PLAYED_TRACKS);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/**
 * Saves recent played track IDs to browser local storage.
 * Safely ignores storage quota errors and SSR environments.
 */
export function savePlayedHistory(history: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.PLAYED_TRACKS,
      JSON.stringify(history),
    );
  } catch {
    // Ignore storage quota errors and SSR environments without window
  }
}

/**
 * Loads the assigned initial beat ID from browser local storage.
 * Returns null when absent, whitespace, or during server-side rendering.
 */
export function loadInitialBeatId(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.INITIAL_BEAT);
    return raw && typeof raw === "string" && raw.trim().length > 0
      ? raw.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Persists the assigned initial beat ID to browser local storage.
 * Ensures page refreshes do not roll a new random track before playback starts.
 */
export function saveInitialBeatId(beatId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.INITIAL_BEAT, beatId);
  } catch {
    // Ignore storage quota errors and SSR environments without window
  }
}
