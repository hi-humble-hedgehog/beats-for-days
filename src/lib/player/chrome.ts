import { ROUTES } from "@/lib/constants";

export const SITE_NAV = [
  { href: ROUTES.ABOUT, label: "About", id: "about" },
  { href: ROUTES.PRIVACY, label: "Privacy", id: "privacy" },
] as const;

/**
 * Global header chrome is hidden everywhere except `/beats`.
 * Poster and editorial routes draw their own Swiss header.
 */
export function shouldShowHeaderNav(pathname?: string | null): boolean {
  return pathname === ROUTES.BEATS;
}

/**
 * Decides whether the persistent bottom player bar should render for a given route.
 * Keeps the bar hidden on full-screen poster pages including the home player and
 * inline about and privacy views. Displays the bar on editorial 404 pages and
 * when a requested beat is missing so background audio remains reachable.
 */
export function shouldShowPersistentPlayerBar(
  pathname?: string | null,
  notFoundBeatId?: string | null,
): boolean {
  if (!pathname || pathname === ROUTES.HOME) return false;
  if (pathname === ROUTES.ABOUT) return false;
  if (pathname === ROUTES.PRIVACY) return false;
  if (pathname.startsWith(`${ROUTES.BEAT}/`)) return Boolean(notFoundBeatId);
  return true;
}
