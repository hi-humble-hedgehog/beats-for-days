const NUMERIC_ID = /^\d+$/;
const CATALOG_MOD = 100;

/**
 * Formats a playhead or duration as `mm:ss` for the seek readout.
 * Invalid or negative values collapse to `00:00` so the slider never lies.
 */
export function formatTime(seconds: number): string {
  // Stryker disable next-line EqualityOperator: 0 already formats as 00:00
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

/**
 * Turns a beat id into a stable integer seed so poster cuts stay per-track.
 * Numeric ids keep their catalog number. Slugs hash to a 32-bit value.
 */
export function seedFromBeatId(id: string): number {
  if (!id || id === "—") return 0;
  const trackMatch = /^track-(\d+)$/i.exec(id);
  if (trackMatch && trackMatch[1]) return Number.parseInt(trackMatch[1], 10);
  if (NUMERIC_ID.test(id)) return Number.parseInt(id, 10);
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatCatalogNumber(value: number): string {
  const safe = Number.isFinite(value) ? Math.abs(Math.floor(value)) : 0;
  return String(safe % CATALOG_MOD).padStart(2, "0");
}

/**
 * Two-digit poster catalog label (`00`..`99`) for a numeric id (`0001`, `0629`) or slug (`track-a`).
 */
export function formatBeatNumber(idOrSeed: string | number): string {
  const seed =
    typeof idOrSeed === "number" ? idOrSeed : seedFromBeatId(idOrSeed);
  return formatCatalogNumber(seed);
}
