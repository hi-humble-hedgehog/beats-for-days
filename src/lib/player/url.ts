/**
 * Returns `true` on player routes (`/` and `/beat/*`) where changing beats should update the URL.
 * Returns `false` on info pages (`/about`, `/generate`) so background audio does not hijack navigation.
 */
export function isBeatPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/beat" || pathname === "/beats") {
    return true;
  }
  return pathname.startsWith("/beat/");
}

/**
 * Formats a beat ID as a 4-digit path like `/beat/0001`.
 * Non-numeric IDs are URL-encoded as-is.
 */
export function formatBeatUrl(beatId: string | number): string {
  const num = typeof beatId === "number" ? beatId : Number(beatId);
  if (!Number.isNaN(num) && Number.isInteger(num) && num > 0) {
    return `/beat/${String(num).padStart(4, "0")}`;
  }
  return `/beat/${encodeURIComponent(String(beatId))}`;
}

export interface HistoryPushTarget {
  pushState: (data: unknown, unused: string, url?: string | URL | null) => void;
}

/**
 * Updates the browser URL with `history.pushState` when a new beat starts.
 * Avoids a Next.js route navigation so the audio player never remounts mid-stream.
 */
export function syncBeatUrl(
  pathname: string,
  beatId: string | number,
  historyTarget?: HistoryPushTarget,
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
  if (target) {
    target.pushState({ beatId }, "", targetUrl);
  }
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
