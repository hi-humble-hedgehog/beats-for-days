/**
 * Design tokens and typography treatments inspired by 90s white-label promo pressings.
 *
 * This module defines the core palette, semantic token mappings,
 * corner radius constants, and reusable typography presets for the Swiss modernist aesthetic.
 */

export const PALETTE = {
  sleeve: "#eceae4",
  vinyl: "#141414",
  stamp: "#d62718",
  pencil: "#6f6d67",
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
