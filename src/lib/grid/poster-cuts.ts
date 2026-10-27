import {
  FULL_TURN,
  MODULE,
  type Band,
  type Cut,
  type Rect,
  visibleSpans,
} from "./poster-model";

type Pivot = { x: number; y: number };
type Size = { w: number; h: number };
export type Ring = { rIn: number; rOut: number };

/**
 * Deterministic 0..1 noise used to stagger cuts and pick start columns.
 * Same seed and salt always yield the same value so posters stay stable.
 */
export function rand(seed: number, salt: number): number {
  let x = Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

function isStraight(angle: number): boolean {
  const q = angle / (Math.PI / 2);
  return Math.abs(q - Math.round(q)) < 1e-6;
}

function appendRingAngle(
  acc: { min: number; max: number },
  point: { x: number; y: number },
  opts: { pivot: Pivot; ring: Ring; unwrap: boolean },
): void {
  const dx = point.x - opts.pivot.x;
  const dy = opts.pivot.y - point.y;
  const d = Math.hypot(dx, dy);
  if (d < opts.ring.rIn || d > opts.ring.rOut) return;
  let a = Math.atan2(dy, dx);
  if (a < 0) a += FULL_TURN;
  if (opts.unwrap && a < Math.PI) a += FULL_TURN;
  if (a < acc.min) acc.min = a;
  if (a > acc.max) acc.max = a;
}

function sampleRectAngles(
  rect: Rect,
  opts: { pivot: Pivot; ring: Ring; unwrap: boolean },
  acc: { min: number; max: number },
): void {
  const nx = Math.min(80, Math.max(8, Math.ceil((rect.x1 - rect.x0) / 4)));
  const ny = Math.min(60, Math.max(8, Math.ceil((rect.y1 - rect.y0) / 4)));
  for (let i = 0; i <= nx; i++) {
    const x = rect.x0 + ((rect.x1 - rect.x0) * i) / nx;
    for (let j = 0; j <= ny; j++) {
      const y = rect.y0 + ((rect.y1 - rect.y0) * j) / ny;
      appendRingAngle(acc, { x, y }, opts);
    }
  }
}

function angularExtent(opts: {
  rects: Rect[];
  pivot: Pivot;
  ring: Ring;
  unwrap: boolean;
}): { min: number; max: number } | null {
  const acc = { min: Infinity, max: -Infinity };
  for (const rect of opts.rects) sampleRectAngles(rect, opts, acc);
  return acc.min === Infinity ? null : acc;
}

function snapCut(extent: { min: number; max: number } | null): Cut | null {
  if (!extent) return null;
  let lo = Math.floor((extent.min - 1e-3) / MODULE) * MODULE;
  let hi = Math.ceil((extent.max + 1e-3) / MODULE) * MODULE;
  if (isStraight(lo)) lo -= MODULE;
  if (isStraight(hi)) hi += MODULE;
  return { lo, hi };
}

/**
 * Module-snapped angular cut of a hitbox inside one ring.
 */
export function hitboxCut(opts: {
  rects: Rect[];
  pivot: Pivot;
  ring: Ring;
  unwrap: boolean;
}): Cut | null {
  if (opts.ring.rOut <= opts.ring.rIn) return null;
  return snapCut(angularExtent(opts));
}

/**
 * Stops a player cut at least one module before due south.
 */
export function keepLeftOfPivot(cut: Cut | null): Cut | null {
  if (!cut) return null;
  return { lo: Math.min(cut.lo, Math.PI * 1.5 - MODULE), hi: cut.hi };
}

/**
 * Widens a cut so neighbouring bands never share an edge line.
 */
export function staggerCut(
  cut: Cut | null,
  extras: { lo: number; hi: number },
): Cut | null {
  if (!cut) return null;
  let lo = cut.lo - extras.lo * MODULE;
  let hi = cut.hi + extras.hi * MODULE;
  if (isStraight(lo)) lo -= MODULE;
  if (isStraight(hi)) hi += MODULE;
  return { lo, hi };
}

function rayLength(opts: { size: Size; pivot: Pivot; angle: number }): number {
  const dx = Math.cos(opts.angle);
  const dy = -Math.sin(opts.angle);
  const tx =
    dx > 1e-9
      ? (opts.size.w - opts.pivot.x) / dx
      : dx < -1e-9
        ? -opts.pivot.x / dx
        : Infinity;
  const ty =
    dy > 1e-9
      ? (opts.size.h - opts.pivot.y) / dy
      : dy < -1e-9
        ? -opts.pivot.y / dy
        : Infinity;
  return Math.min(tx, ty);
}

function spanReachesPastInner(opts: {
  from: number;
  to: number;
  inner: number;
  size: Size;
  pivot: Pivot;
}): boolean {
  const step = MODULE / 8;
  for (let a = opts.from; a <= opts.to + 1e-6; a += step) {
    if (
      rayLength({ size: opts.size, pivot: opts.pivot, angle: a }) > opts.inner
    )
      return true;
  }
  return false;
}

/**
 * A band stays when some ray in its drawn spans clears the inner radius.
 */
export function isVisible(opts: {
  band: Band;
  size: Size;
  pivot: Pivot;
}): boolean {
  for (const [from, to] of visibleSpans(
    opts.band.from,
    opts.band.to,
    opts.band.cut,
  )) {
    if (
      spanReachesPastInner({
        from,
        to,
        inner: opts.band.inner,
        size: opts.size,
        pivot: opts.pivot,
      })
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Turns a player cut into the drawn `from`/`to` sweep of a band.
 */
export function applyUiCut(
  raw: Cut | null,
  extras: { lo: number; hi: number },
): { from: number; to: number } {
  const ui = staggerCut(raw, extras);
  return {
    from: ui ? ui.hi - FULL_TURN : 0,
    to: ui ? ui.lo : FULL_TURN,
  };
}
