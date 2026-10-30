const BLOCKED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

export type PosterShortcut = "toggle" | "previous" | "next";

/**
 * Blocks poster shortcuts when focus is in a field, control, or link.
 * Those elements already handle Space, arrows, and typed characters.
 */
export function isShortcutBlockedTarget(target: EventTarget | null): boolean {
  if (target == null) return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  return typeof el.tagName === "string" && BLOCKED_TAGS.has(el.tagName);
}

const SHORTCUTS: Record<string, PosterShortcut> = {
  " ": "toggle",
  Spacebar: "toggle",
  ArrowLeft: "previous",
  ArrowRight: "next",
};

/**
 * Maps a keydown to a poster transport action, or `null` when it should pass.
 * Modifier chords stay with the browser (refresh, inspect, next tab).
 */
export function resolvePosterShortcut(opts: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}): PosterShortcut | null {
  if (opts.metaKey || opts.ctrlKey || opts.altKey) return null;
  if (isShortcutBlockedTarget(opts.target)) return null;
  return SHORTCUTS[opts.key] ?? null;
}
