export function isBeatPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/beat") {
    return true;
  }
  return pathname.startsWith("/beat/");
}

export function formatBeatUrl(beatId: string): string {
  return `/beat/${encodeURIComponent(beatId)}`;
}

export interface HistoryPushTarget {
  pushState: (data: unknown, unused: string, url?: string | URL | null) => void;
}

export function syncBeatUrl(
  pathname: string,
  beatId: string,
  historyTarget?: HistoryPushTarget,
): boolean {
  if (!isBeatPage(pathname)) {
    return false;
  }

  const target =
    historyTarget ??
    (typeof window !== "undefined" ? window.history : undefined);
  if (target) {
    target.pushState({ beatId }, "", formatBeatUrl(beatId));
  }
  return true;
}
