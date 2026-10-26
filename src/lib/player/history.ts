import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Loads recent played track IDs from browser local storage.
 * Safely returns an empty array on the server or if storage is unreadable.
 */
export function loadPlayedHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    return (
      (JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.PLAYED_TRACKS) || "[]",
      ) as string[]) || []
    );
  } catch {
    return [];
  }
}

/**
 * Saves recent played track IDs to browser local storage.
 * Safely ignores storage quota errors and SSR environments.
 */
export function savePlayedHistory(history: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.PLAYED_TRACKS,
      JSON.stringify(history),
    );
  } catch {
    // Ignore storage quota errors
  }
}
