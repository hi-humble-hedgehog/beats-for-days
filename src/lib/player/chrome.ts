import { ROUTES } from "@/lib/constants";

export const SITE_NAV = [
  { href: ROUTES.ABOUT, label: "About", id: "about" },
  { href: ROUTES.PRIVACY, label: "Privacy", id: "privacy" },
] as const;

/**
 * Checks whether the Swiss poster player shell should wrap the route.
 * Mounts the poster shell on all public routes, including 404 pages.
 * Keeps local admin management isolated from the consumer audio shell.
 */
export function shouldShowPosterPlayer(pathname?: string | null): boolean {
  if (!pathname) return true;
  return !pathname.startsWith(ROUTES.ADMIN);
}
