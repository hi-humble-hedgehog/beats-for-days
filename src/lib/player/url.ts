/**
 * Returns `true` on beat deck routes (`/beat`, `/beats`, and `/beat/*`) where changing beats should update the URL.
 * Returns `false` on info pages (`/about`, `/generate`) so background audio does not hijack navigation.
 */
export function isBeatPage(pathname: string): boolean {
  if (pathname === "/beat" || pathname === "/beats") {
    return true;
  }
  return pathname.startsWith("/beat/");
}

/**
 * Formats a beat ID as a 2-digit path like `/beat/01` (with leading zeros below 10).
 * Handles numeric values, numeric strings, and prefixed strings like "track-01".
 * Non-numeric IDs are URL-encoded as-is.
 */
export function formatBeatUrl(beatId: string | number): string {
  const str = String(beatId);
  const trackMatch = /^track-(\d+)$/i.exec(str);
  const rawNum = trackMatch ? Number(trackMatch[1]) : Number(str);
  if (!Number.isNaN(rawNum) && Number.isInteger(rawNum) && rawNum > 0) {
    return `/beat/${String(rawNum).padStart(2, "0")}`;
  }
  return `/beat/${encodeURIComponent(str)}`;
}

export interface HistoryPushTarget {
  pushState: (data: unknown, unused: string, url?: string | URL | null) => void;
  replaceState?: (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) => void;
}

function writeHistoryEntry(
  target: HistoryPushTarget | undefined,
  beatId: string | number,
  targetUrl: string,
  replace: boolean,
): void {
  if (!target) return;
  if (replace && target.replaceState) {
    target.replaceState({ beatId }, "", targetUrl);
    return;
  }
  target.pushState({ beatId }, "", targetUrl);
}

/**
 * Updates the browser URL with `history.pushState` (or `replaceState` when stepping back) when a beat starts.
 * Avoids a Next.js route navigation so the audio player never remounts mid-stream.
 */
export function syncBeatUrl(
  pathname: string,
  beatId: string | number,
  historyTarget?: HistoryPushTarget,
  replace = false,
): boolean {
  if (!isBeatPage(pathname)) {
    return false;
  }

  const targetUrl = formatBeatUrl(beatId);
  const currentPath =
    typeof window !== "undefined"
      ? (window.location?.pathname ?? pathname)
      : pathname;
  if (currentPath === targetUrl) {
    return false;
  }

  const target =
    historyTarget ??
    (typeof window !== "undefined" ? window.history : undefined);
  writeHistoryEntry(target, beatId, targetUrl, replace);
  return true;
}

/**
 * Extracts the beat ID from a beat route pathname like `/beat/0001`.
 * Returns `null` if the pathname does not point to a specific beat.
 */
export function extractBeatIdFromPathname(pathname: string): string | null {
  const match = /^\/beat\/([^/?#]+)/.exec(pathname);
  if (!match || !match[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}
