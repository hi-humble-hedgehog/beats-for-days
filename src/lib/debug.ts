/**
 * Checks the `?debug=1` query flag. The debug panel needs this flag on top of
 * the `DEBUG_PANEL` env var, so only people who ask for it see it on prod.
 */
export function isDebugQueryEnabled(
  params: Pick<URLSearchParams, "get"> | null,
): boolean {
  return params?.get("debug") === "1";
}

/**
 * Decides whether the debug panel should mount based on query param or persisted cookie.
 */
export function shouldRenderDebugGate(opts: {
  hasQueryFlag: boolean;
  hasCookie: boolean;
}): boolean {
  return opts.hasQueryFlag || opts.hasCookie;
}
