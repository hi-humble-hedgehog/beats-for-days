import { computeInnerBars } from "./poster-geometry";
import type { Band, Cut, Geometry } from "./poster-model";

/**
 * Linearly interpolates between two numbers.
 *
 * @param a Start value.
 * @param b End value.
 * @param t Transition progress between 0 and 1.
 * @returns Interpolated number.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolates a title cutout between two states.
 * Opens or closes the cut smoothly from its center when one state has no cut.
 *
 * @param a Source cutout or null.
 * @param b Target cutout or null.
 * @param t Transition progress between 0 and 1.
 * @returns Interpolated cutout, or null when closed.
 */
export function interpolateCut(
  a: Cut | null,
  b: Cut | null,
  t: number,
): Cut | null {
  if (!a && !b) return null;
  if (a && b) {
    return { lo: lerp(a.lo, b.lo, t), hi: lerp(a.hi, b.hi, t) };
  }
  if (!a && b) {
    const mid = (b.lo + b.hi) / 2;
    return { lo: lerp(mid, b.lo, t), hi: lerp(mid, b.hi, t) };
  }
  if (a && !b) {
    if (t >= 1) return null;
    const mid = (a.lo + a.hi) / 2;
    return { lo: lerp(a.lo, mid, t), hi: lerp(a.hi, mid, t) };
  }
  return null;
}

/**
 * Creates a synthetic band baseline when one geometry has fewer bands than the other.
 */
function fallbackBand(ref: Band, side: "source" | "target"): Band {
  return {
    k: ref.k,
    inner: ref.inner,
    outer: side === "source" ? ref.inner : ref.outer,
    from: ref.from,
    to: ref.to,
    cut: ref.cut,
  };
}

/**
 * Interpolates a single concentric band between source and target geometries.
 *
 * @param a Source band or undefined.
 * @param b Target band or undefined.
 * @param k Band index.
 * @param t Progress factor.
 * @returns Morphed band.
 */
function interpolateBand(
  a: Band | undefined,
  b: Band | undefined,
  k: number,
  t: number,
): Band {
  const fromBand = a ?? (b ? fallbackBand(b, "source") : undefined);
  const toBand = b ?? (a ? fallbackBand(a, "target") : undefined);

  if (!fromBand || !toBand) {
    return { k, inner: 0, outer: 0, from: 0, to: 0, cut: null };
  }

  return {
    k,
    inner: lerp(fromBand.inner, toBand.inner, t),
    outer: lerp(fromBand.outer, toBand.outer, t),
    from: lerp(fromBand.from, toBand.from, t),
    to: lerp(fromBand.to, toBand.to, t),
    cut: interpolateCut(fromBand.cut, toBand.cut, t),
  };
}

/**
 * Morph whole poster geometry continuously between two tracks.
 * Interpolates radii, angles, cutouts, and inner bars so Swiss rings glide smoothly.
 *
 * @param from Source geometry.
 * @param to Target geometry.
 * @param progress Transition fraction clamped between 0 and 1.
 * @returns Morphed intermediate geometry.
 */
export function interpolateGeometry(
  from: Geometry,
  to: Geometry,
  progress: number,
): Geometry {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return from;
  if (t === 1) return to;

  const start = lerp(from.start, to.start, t);
  const totalBands = Math.max(from.bands.length, to.bands.length);
  const bands: Band[] = [];

  for (let k = 0; k < totalBands; k++) {
    bands.push(interpolateBand(from.bands[k], to.bands[k], k, t));
  }

  return {
    ...to,
    start,
    startCols: lerp(from.startCols, to.startCols, t),
    numberSize: lerp(from.numberSize, to.numberSize, t),
    rings: bands.length,
    bands,
    ...computeInnerBars(start),
  };
}
