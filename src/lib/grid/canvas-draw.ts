import {
  BAND_GUTTER,
  visibleSpans,
  type Band,
  type Bar,
  type Geometry,
} from "./poster-geometry";

export type Span = [number, number];

const MARKER_GROUP_SIZE = 2;
const BAR_RADIAL_THICKNESS = 6;
const PIN_RADIUS = 8;

/**
 * Device-pixel radii for one vinyl ring.
 * Canvas throws IndexSizeError when `arc` gets a negative radius, which is
 * what a zero-width poster measure produces for the innermost band.
 * A negative inner edge is pulled out to the pivot so the visible part still fills.
 * A ring that never leaves the pivot is skipped.
 */
export function ringRadii(
  rIn: number,
  rOut: number,
): { rIn: number; rOut: number } | null {
  return rOut <= 0 ? null : { rIn: Math.max(0, rIn), rOut };
}

/**
 * Overlapping angular spans used to fill gutters that two neighbouring rings share.
 * A pair only contributes when the overlap is wider than a hairline.
 */
export function intersectSpans(a: Span[], b: Span[]): Span[] {
  const out: Span[] = [];
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (hi - lo > 1e-6) out.push([lo, hi]);
    }
  }
  return out;
}

/**
 * Index of the stamp-red gutter: the gap below the first band that opens a title cut.
 * Returns `-1` when no band is cut so the vinyl drawer can skip the accent.
 */
export function accentGutterIndex(bands: Pick<Band, "cut">[]): number {
  const firstCut = bands.findIndex((band) => band.cut);
  return firstCut > 0 ? firstCut - 1 : firstCut === 0 ? 0 : -1;
}

/**
 * Radial inset of a marker group so clipped bars stay inside a visible span.
 */
export function markerEdgeInset(bars: Pick<Bar, "from" | "to">[]): number {
  // Stryker disable next-line ConditionalExpression: empty list already returns 0 below
  if (bars.length === 0) return 0;
  const last = bars[Math.min(MARKER_GROUP_SIZE - 1, bars.length - 1)];
  const first = bars[0];
  if (!first || !last) return 0;
  return last.to - first.from;
}

export type MarkerRadii = {
  outer: number;
  inner: number;
  halfGutter: number;
};

/**
 * Device-pixel radii for resting red markers inside the first ring.
 * Returns `null` when the inner edge would collapse into the gutter.
 */
export function markerRadii(base: number, dpr: number): MarkerRadii | null {
  const halfGutter = (BAND_GUTTER / 2) * dpr;
  const outer = base - dpr;
  const inner = outer - BAR_RADIAL_THICKNESS * dpr;
  if (inner <= halfGutter) return null;
  return { outer, inner, halfGutter };
}

/**
 * Small angular tilts that keep marker sides parallel to the 2px gutter.
 */
export function markerTilts(radii: MarkerRadii): {
  tiltOuter: number;
  tiltInner: number;
} {
  return {
    tiltOuter: Math.asin(radii.halfGutter / radii.outer),
    tiltInner: Math.asin(radii.halfGutter / radii.inner),
  };
}

export type VinylPalette = { ink: string; stamp: string; sleeve: string };
export type FrameParams = {
  geometry: Geometry;
  colors: VinylPalette;
  dpr: number;
};

/**
 * Fills an angular arc span of a concentric ring.
 */
export function fillRingSpan(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radii: { rIn: number; rOut: number },
  span: { from: number; to: number },
): void {
  const ring = ringRadii(radii.rIn, radii.rOut);
  if (!ring) return;
  ctx.beginPath();
  ctx.arc(center.x, center.y, ring.rOut, -span.from, -span.to, true);
  ctx.arc(center.x, center.y, ring.rIn, -span.to, -span.from, false);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws concentric gutters between adjacent vinyl bands with accent color.
 */
export function drawGutters(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  dpr: number,
  style: { stamp: string; sleeve: string },
): void {
  const cx = geometry.px * dpr;
  const cy = geometry.py * dpr;
  const overlap = Math.max(1, dpr);
  const accent = accentGutterIndex(geometry.bands);
  const { stamp, sleeve } = style;
  for (let k = 0; k < geometry.rings - 1; k++) {
    const lower = geometry.bands[k];
    const upper = geometry.bands[k + 1];
    if (!lower || !upper) continue;
    ctx.fillStyle = k === accent ? stamp : sleeve;
    const rIn = lower.outer * dpr - overlap;
    const rOut = upper.inner * dpr + overlap;
    for (const [a, b] of intersectSpans(
      visibleSpans(lower.from, lower.to, lower.cut),
      visibleSpans(upper.from, upper.to, upper.cut),
    )) {
      fillRingSpan(ctx, { x: cx, y: cy }, { rIn, rOut }, { from: a, to: b });
    }
  }
}

/**
 * Draws ink-colored concentric bands with safezone cuts.
 */
export function drawBands(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  dpr: number,
  style: { ink: string },
): void {
  const cx = geometry.px * dpr;
  const cy = geometry.py * dpr;
  ctx.fillStyle = style.ink;
  for (const band of geometry.bands) {
    for (const [a, b] of visibleSpans(band.from, band.to, band.cut)) {
      fillRingSpan(
        ctx,
        { x: cx, y: cy },
        {
          rIn: band.inner * dpr,
          rOut: band.outer * dpr,
        },
        { from: a, to: b },
      );
    }
  }
}

/**
 * Draws the centre vinyl turntable spindle and pin.
 */
export function drawSpindle(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  dpr: number,
  style: { stamp: string; sleeve: string },
): void {
  const cx = geometry.px * dpr;
  const cy = geometry.py * dpr;
  ctx.fillStyle = style.stamp;
  ctx.beginPath();
  const spindleR = Math.max(
    geometry.start * dpr * 0.06,
    (PIN_RADIUS + 3) * dpr,
  );
  ctx.arc(cx, cy, spindleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.sleeve;
  ctx.beginPath();
  ctx.arc(cx, cy, PIN_RADIUS * dpr, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Clears canvas and renders concentric bands, gutters, and spindle.
 */
export function renderVinylFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  params: FrameParams,
): void {
  const { geometry, colors, dpr } = params;
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  drawGutters(ctx, geometry, dpr, {
    stamp: colors.stamp,
    sleeve: colors.sleeve,
  });
  drawBands(ctx, geometry, dpr, { ink: colors.ink });
  drawSpindle(ctx, geometry, dpr, {
    stamp: colors.stamp,
    sleeve: colors.sleeve,
  });
}
