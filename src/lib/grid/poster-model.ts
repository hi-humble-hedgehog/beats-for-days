export const MODULE = Math.PI / 16;
export const BAND_GUTTER = 2;
export const FULL_TURN = Math.PI * 2;
export const BARS_PER_SLICE = 2;

export type Rect = { x0: number; y0: number; x1: number; y1: number };
export type Cut = { lo: number; hi: number };
export type Band = {
  k: number;
  inner: number;
  outer: number;
  from: number;
  to: number;
  cut: Cut | null;
};
export type Bar = { from: number; to: number };

export type GridMetrics = {
  w: number;
  h: number;
  mobile: boolean;
  cols: number;
  rows: number;
  margin: number;
  gap: number;
  colW: number;
  rowH: number;
  px: number;
  py: number;
};

export type HitboxRects = {
  titleRects: Rect[];
  uiRects: Rect[];
  numberSize: number;
  start: number;
  startCols: number;
};

export type Geometry = GridMetrics &
  HitboxRects & {
    rings: number;
    bands: Band[];
    bars: Bar[];
    barBase: number;
  };

/**
 * Doubling band widths in CSS pixels: 8, 16, 32, 64, 128, 256, 512…
 */
export function bandWidth(k: number): number {
  return 8 * 2 ** k;
}

/**
 * Inner radius of band `k`, counting gutters from the first-band start.
 */
export function bandInner(k: number, start: number): number {
  let radius = start;
  for (let j = 0; j < k; j++) radius += bandWidth(j) + BAND_GUTTER;
  return radius;
}

/**
 * Outer radius of band `k` (inner edge plus that band's width).
 */
export function bandOuter(k: number, start: number): number {
  return bandInner(k, start) + bandWidth(k);
}

/**
 * Midpoint of the gutter sitting outside band `k`.
 */
export function gutterMid(k: number, start: number): number {
  return bandOuter(k, start) + BAND_GUTTER / 2;
}

/**
 * Visible arc spans of a ring after subtracting an optional title cut.
 */
export function visibleSpans(
  from: number,
  to: number,
  cut: Cut | null,
): [number, number][] {
  if (!cut) return [[from, to]];
  const spans: [number, number][] = [];
  if (from < cut.lo) spans.push([from, Math.min(to, cut.lo)]);
  if (to > cut.hi) spans.push([Math.max(from, cut.hi), to]);
  return spans;
}
