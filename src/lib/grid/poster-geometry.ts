/**
 * Müller-Brockmann Tonhalle 1955 poster geometry.
 * Concentric bands double in width and open around title and player hitboxes.
 */

import {
  applyUiCut,
  hitboxCut,
  isVisible,
  keepLeftOfPivot,
  rand,
  staggerCut,
  type Ring,
} from "./poster-cuts";
import {
  BAND_GUTTER,
  BARS_PER_SLICE,
  FULL_TURN,
  MODULE,
  bandInner,
  bandOuter,
  type Band,
  type Cut,
  type Geometry,
  type GridMetrics,
  type HitboxRects,
  type Rect,
} from "./poster-model";

export {
  BAND_GUTTER,
  BARS_PER_SLICE,
  FULL_TURN,
  MODULE,
  bandInner,
  bandOuter,
  bandWidth,
  gutterMid,
  visibleSpans,
  type Band,
  type Bar,
  type Geometry,
  type GridMetrics,
  type HitboxRects,
} from "./poster-model";

const MIN_BANDS = 5;
const MAX_BANDS = 16;

/**
 * Orthogonal module, gutter-aligned pivot, and column/row sizes for a viewport.
 */
export function computeGridMetrics(w: number, h: number): GridMetrics {
  const mobile = w < 768;
  const cols = mobile ? 6 : 12;
  const rows = mobile ? 10 : 8;
  const margin = mobile ? 16 : 32;
  const gap = mobile ? 12 : 16;
  const colW = (w - 2 * margin - (cols - 1) * gap) / cols;
  const rowH = (h - 2 * margin - (rows - 1) * gap) / rows;
  const gutterX = (line: number) => margin + line * (colW + gap) - gap / 2;
  const gutterY = (line: number) => margin + line * (rowH + gap) - gap / 2;
  const px = gutterX(mobile ? 1 : 5);
  const py = gutterY(5);
  return { w, h, mobile, cols, rows, margin, gap, colW, rowH, px, py };
}

function desktopTagRect(margin: number, gap: number): Rect {
  const tagTop = margin + 84 + 12;
  return {
    x0: margin - 6,
    y0: tagTop - 6,
    x1: margin + 218,
    y1: tagTop + 45 + gap,
  };
}

/**
 * Title and player hitboxes plus the first-band start distance from the pivot.
 * Anchors start to the smaller module so wide viewports keep a balanced center label.
 */
export function computeHitboxRects(
  metrics: GridMetrics,
  seed: number,
): HitboxRects {
  const { w, h, mobile, margin, gap, px, py } = metrics;
  const baseModule = Math.min(metrics.colW, metrics.rowH);
  const startCols = mobile ? 2 : 2 + Math.floor(rand(seed, 98) * 2);
  const start = startCols * (baseModule + gap);
  const quadrantW = w - margin - px - gap / 2;
  const quadrantH = h - margin - py - gap / 2;
  const controlsW = mobile ? quadrantW : Math.min(384, quadrantW);
  const numberSize = Math.max(
    56,
    Math.min(controlsW / 1.75, (quadrantH - 170) / 0.85),
  );
  const left = px + gap / 2;
  const head = mobile ? { w: 104, h: 52 } : { w: 166, h: 84 };
  const titleRects: Rect[] = [
    {
      x0: margin - 6,
      y0: margin - 6,
      x1: margin + head.w + 6,
      y1: margin + head.h + 6,
    },
  ];
  if (!mobile) titleRects.push(desktopTagRect(margin, gap));
  const numberTop = h - margin - 140 - (mobile ? 8 : 16) - numberSize * 0.78;
  return {
    titleRects,
    uiRects: [
      {
        x0: left - 10,
        y0: numberTop - 24,
        x1: left + controlsW + 10,
        y1: numberTop + numberSize * 0.78 + 10,
      },
      {
        x0: left - 10,
        y0: h - margin - 150,
        x1: left + controlsW + 10,
        y1: h - margin + 10,
      },
    ],
    numberSize,
    start,
    startCols,
  };
}

function pickExtra(
  seed: number,
  k: number,
  salt: number,
  prev: number,
): number {
  const roll = Math.floor(rand(seed, salt + k) * 4);
  return k === 0 ? roll : (prev + 1 + (roll % 3)) % 4;
}

function ringForBand(k: number, start: number): Ring {
  return { rIn: bandInner(k, start), rOut: bandOuter(k, start) - 0.6 };
}

function titleCutForBand(
  k: number,
  seed: number,
  hitboxes: HitboxRects,
  pivot: { x: number; y: number },
): Cut | null {
  return staggerCut(
    hitboxCut({
      rects: hitboxes.titleRects,
      pivot,
      ring: ringForBand(k, hitboxes.start),
      unwrap: false,
    }),
    {
      lo: (Math.floor(rand(seed, 70) * 3) + 2 * k) % 3,
      hi: (Math.floor(rand(seed, 71) * 3) + k) % 3,
    },
  );
}

function buildBand(opts: {
  k: number;
  pivot: { x: number; y: number };
  hitboxes: HitboxRects;
  seed: number;
  extras: { lo: number; hi: number };
  fallbackUi?: Cut | null;
}): { band: Band; rawUi: Cut | null } {
  const directUi = keepLeftOfPivot(
    hitboxCut({
      rects: opts.hitboxes.uiRects,
      pivot: opts.pivot,
      ring: ringForBand(opts.k, opts.hitboxes.start),
      unwrap: true,
    }),
  );
  const rawUi = directUi ?? opts.fallbackUi ?? null;
  const span = applyUiCut(rawUi, opts.extras);
  return {
    rawUi,
    band: {
      k: opts.k,
      inner: bandInner(opts.k, opts.hitboxes.start),
      outer: bandOuter(opts.k, opts.hitboxes.start),
      from: span.from,
      to: span.to,
      cut: titleCutForBand(opts.k, opts.seed, opts.hitboxes, opts.pivot),
    },
  };
}

function tightenOuterBands(opts: {
  bands: Band[];
  uiRaw: (Cut | null)[];
  hitboxes: HitboxRects;
  pivot: { x: number; y: number };
  seed: number;
}): void {
  const outerLoPhase = Math.floor(rand(opts.seed, 72) * 2);
  const outerHiPhase = Math.floor(rand(opts.seed, 73) * 2);
  for (const band of opts.bands.slice(-2)) {
    band.cut = hitboxCut({
      rects: opts.hitboxes.titleRects,
      pivot: opts.pivot,
      ring: ringForBand(band.k, opts.hitboxes.start),
      unwrap: false,
    });
    const span = applyUiCut(opts.uiRaw[band.k] ?? null, {
      lo: (outerLoPhase + band.k) % 2,
      hi: (outerHiPhase + band.k) % 2,
    });
    band.from = span.from;
    band.to = span.to;
  }
}

/**
 * Builds concentric rings until the next band would miss the viewport.
 * Projects UI cuts to outer bands so wide screens preserve stepped cuts.
 */
export function buildConcentricBands(
  metrics: GridMetrics,
  hitboxes: HitboxRects,
  seed: number,
): Band[] {
  const pivot = { x: metrics.px, y: metrics.py };
  const size = { w: metrics.w, h: metrics.h };
  const bands: Band[] = [];
  const uiRaw: (Cut | null)[] = [];
  let prevLoExtra = 0;
  let prevHiExtra = 0;
  let lastUiCut: Cut | null = null;
  for (let k = 0; k < MAX_BANDS; k++) {
    prevLoExtra = pickExtra(seed, k, 80, prevLoExtra);
    prevHiExtra = pickExtra(seed, k, 120, prevHiExtra);
    const built = buildBand({
      k,
      pivot,
      hitboxes,
      seed,
      extras: { lo: prevLoExtra, hi: prevHiExtra },
      fallbackUi: lastUiCut,
    });
    if (built.rawUi) lastUiCut = built.rawUi;
    uiRaw.push(built.rawUi);
    if (k >= MIN_BANDS && !isVisible({ band: built.band, size, pivot })) break;
    bands.push(built.band);
  }
  tightenOuterBands({ bands, uiRaw, hitboxes, pivot, seed });
  return bands;
}

/**
 * Resting-marker bars and base radius inside the first ring.
 */
export function computeInnerBars(
  start: number,
): Pick<Geometry, "bars" | "barBase"> {
  const barStep = MODULE / BARS_PER_SLICE;
  const bars: Geometry["bars"] = [];
  const barCount = Math.round(FULL_TURN / barStep);
  for (let i = 0; i < barCount; i++) {
    bars.push({ from: i * barStep, to: (i + 1) * barStep });
  }
  return {
    bars,
    barBase: start - BAND_GUTTER,
  };
}

/**
 * Full poster construction for a viewport and a beat seed.
 */
export function computeGeometry(w: number, h: number, seed: number): Geometry {
  const metrics = computeGridMetrics(w, h);
  const hitboxes = computeHitboxRects(metrics, seed);
  const bands = buildConcentricBands(metrics, hitboxes, seed);
  return {
    ...metrics,
    ...hitboxes,
    rings: bands.length,
    bands,
    ...computeInnerBars(hitboxes.start),
  };
}
