/**
 * Design tokens inspired by 90s white-label promo pressings.
 *
 * Uses perceptual OKLCH (`oklch(L C H)`) values calibrated for WCAG 2.2 AA/AAA contrast
 * against sleeve paper (`--sleeve`). Verified statically by `pnpm lint:a11y`.
 */

export const PALETTE = {
  sleeve: "oklch(0.9369 0.0083 91.49)",
  vinyl: "oklch(0.1913 0 0)",
  stamp: "oklch(0.5371 0.2035 29.91)",
  pencil: "oklch(0.5102 0.0096 91.57)",
} as const;
