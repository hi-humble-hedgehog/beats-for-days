/**
 * Design tokens and typography treatments inspired by 90s white-label promo pressings.
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

export const SEMANTIC_TOKENS = {
  background: PALETTE.sleeve,
  card: PALETTE.sleeve,
  popover: PALETTE.sleeve,
  muted: PALETTE.sleeve,
  foreground: PALETTE.vinyl,
  cardForeground: PALETTE.vinyl,
  popoverForeground: PALETTE.vinyl,
  border: PALETTE.vinyl,
  input: PALETTE.vinyl,
  secondary: PALETTE.vinyl,
  primary: PALETTE.stamp,
  accent: PALETTE.stamp,
  destructive: PALETTE.stamp,
  ring: PALETTE.stamp,
  primaryForeground: PALETTE.sleeve,
  secondaryForeground: PALETTE.sleeve,
  accentForeground: PALETTE.sleeve,
  mutedForeground: PALETTE.pencil,
} as const;

export const RADIUS = "0rem" as const;

export const RADIUS_TOKENS = {
  sm: RADIUS,
  md: RADIUS,
  lg: RADIUS,
  xl: RADIUS,
} as const;

export const FONT_STACK =
  "var(--font-inter-tight), 'Helvetica Neue', Helvetica, Arial, sans-serif" as const;

export const TYPOGRAPHY = {
  posterDisplay: "font-bold tracking-[-0.07em] leading-[0.78] tabular-nums",
  heading: "text-3xl md:text-5xl font-bold tracking-tighter leading-[0.85]",
  label: "text-xs font-bold uppercase tracking-widest",
  numeric: "tabular-nums",
} as const;
