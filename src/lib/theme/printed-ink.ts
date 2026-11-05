/**
 * Tactile printed-ink surface: tuning parameters for the global SVG filter
 * rendered by `src/components/ui/PrintedInkFilter.tsx` and referenced by the
 * `.printed-ink` class in `src/app/globals.css`.
 * Rationale: docs/decisions/0007-tactile-printed-surface.md
 */

export const PRINTED_INK_FILTER_ID = "printed-ink-filter";

/** Seamless, 50%-gray-centred grayscale tile (same origin, for `<feImage>`). */
export const PAPER_TILE = {
  href: "/textures/paper-tile-512.jpg",
  size: 512,
} as const;

export interface PrintedInkParams {
  /** Edge-bleed noise frequency. Higher = finer fibrous jaggedness. */
  edgeBleedFrequency: number;
  /** Edge-bleed displacement (px). How far ink feathers from the glyph edge. */
  edgeBleedScale: number;
  /** Paper-tile displacement (px). How strongly glyphs bend with the stock. */
  surfaceWarpScale: number;
  /** Pinhole noise frequency. Lower = bigger, clumpier pinholes. */
  poreFrequency: number;
  /** Share of the ink with pinholes (0–1). Keeps large solids mostly solid. */
  poreDensity: number;
  /** Ink-density unevenness frequency. Very low = broad, soft patches. */
  mottleFrequency: number;
  /** Depth of the uneven patches (0–0.3 coverage loss). */
  mottleAmount: number;
}

export const DEFAULT_PRINTED_INK_PARAMS: Readonly<PrintedInkParams> = {
  edgeBleedFrequency: 0.45,
  edgeBleedScale: 1.6,
  surfaceWarpScale: 3,
  poreFrequency: 0.35,
  poreDensity: 0.3,
  mottleFrequency: 0.012,
  mottleAmount: 0.03,
};

const PARAM_RANGES: Readonly<
  Record<keyof PrintedInkParams, readonly [min: number, max: number]>
> = {
  edgeBleedFrequency: [0.25, 0.7],
  edgeBleedScale: [0, 3.5],
  surfaceWarpScale: [0, 8],
  poreFrequency: [0.1, 1.2],
  poreDensity: [0, 1],
  mottleFrequency: [0.002, 0.1],
  mottleAmount: [0, 0.3],
};

function clampParam(key: keyof PrintedInkParams, value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PRINTED_INK_PARAMS[key];
  const [min, max] = PARAM_RANGES[key];
  return Math.min(max, Math.max(min, value));
}

/** Merges overrides onto the defaults, clamped to the supported ranges. */
export function resolvePrintedInkParams(
  overrides: Partial<PrintedInkParams> = {},
): PrintedInkParams {
  const merged = { ...DEFAULT_PRINTED_INK_PARAMS, ...overrides };
  const keys = Object.keys(PARAM_RANGES) as (keyof PrintedInkParams)[];
  return Object.fromEntries(
    keys.map((key) => [key, clampParam(key, merged[key])]),
  ) as unknown as PrintedInkParams;
}

/** Pinhole edge sharpness: alpha goes 0 → 1 over 1/12 of the noise range. */
const PORE_GAIN = 12;

function alphaRamp(slope: number, intercept: number): string {
  const round = (n: number) => Number(n.toFixed(4));
  return `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${round(slope)} 0 0 0 ${round(intercept)}`;
}

/**
 * `<feColorMatrix>` values for sparse pinholes: alpha = 12 * (R - cutoff).
 * Only noise troughs below the cutoff lose ink, so large solids stay solid
 * (a uniform grain reads as TV static on big shapes).
 */
export function poreAlphaMatrix(density: number): string {
  const cutoff = 0.1 + 0.2 * density;
  return alphaRamp(PORE_GAIN, -PORE_GAIN * cutoff);
}

/**
 * `<feColorMatrix>` values for broad ink-density patches:
 * alpha = 1 - 3m + 4m * R, i.e. 1 - m at average noise, clamped at 1.
 */
export function mottleAlphaMatrix(amount: number): string {
  return alphaRamp(4 * amount, 1 - 3 * amount);
}
