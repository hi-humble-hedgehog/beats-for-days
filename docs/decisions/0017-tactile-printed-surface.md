# 0017. Use an SVG filter + blend modes for the tactile printed surface

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

The visual identity is a 90s offset/screen-printed record sleeve: ink that
bleeds into uncoated paper, starved ink grain, overprinting colours. Text must
stay live HTML (selection, find-in-page, screen readers, SEO). The headless
stream worker renders the same UI 24/7, so the effect has to be cheap and
look the same in headless Chromium.

## Decision

We will:

1. Render one hidden global SVG filter (`#printed-ink-filter`,
   `src/components/ui/PrintedInkFilter.tsx`) in the root layout. Tuning
   parameters and their clamped ranges live in `src/lib/theme/printed-ink.ts`.
   The pipeline:
   - **Edge bleed:** `feTurbulence` → `feDisplacementMap` on the glyphs.
   - **Surface warp:** a same-origin paper tile (`feImage` at 0,0 + `feTile`),
     blurred into relief, then horizontal/vertical Sobel slopes
     (`feConvolveMatrix`) packed into R/G drive a second displacement, so
     edges move in 2D along the paper.
   - **Ink coverage:** two noise layers mapped to **alpha** (not colour), so
     the real paper shows through: sparse, sharp pinholes (about 0.5% of the
     area) times broad, soft ink-density patches. A uniform per-pixel grain
     looked fine on small type but turned large solids into TV static.
2. Apply it with `.printed-ink` (`filter` + `mix-blend-mode: multiply`) on
   heading/plate elements inside `.paper-surface`. Multiply blending puts the
   actual substrate inside the ink, so no in-filter paper blend (and no tile
   phase alignment) is needed. Copy under 14px uses `.printed-ink-sm`.
3. Use one warm uncoated stock (`#FAF5E9`) with off-black/colour ink tokens,
   and **no dark mode**: subtractive (multiply) ink physics need a light
   substrate.
4. Ship a seamless grayscale 512px tile centred at 50% gray
   (`public/textures/paper-tile-512.jpg`, about 50 KB). The paper relief is a
   `hard-light` pseudo-element at `--paper-tooth` opacity (`overlay` is nearly
   invisible on a ~98% bright base).

## Consequences

- Filters run on the CPU when a filtered subtree repaints. Never put animated
  content (visualizer, canvas, transitions) inside `.printed-ink`; apply it
  per plate, not per character.
- Chrome clips a negatively offset `feImage` to the filter region. Tiles must
  start at (0,0), which is why we use gradients instead of a phase-shifted
  second copy.
- `html` needs its own background, or body's background moves to the canvas
  and the isolated paper group has nothing to blend onto.
- Forced-colours mode turns off the filter, blending and relief.
- Filter output can't be unit-tested in happy-dom. Tests cover parameters and
  wiring; we check the look in a real browser (Chrome verified, Safari still
  to check by hand).
- Dropping dark mode is a product decision; reverse it with a new ADR and an
  inverted (screen-blend) filter variant.

## Alternatives considered

- **Canvas/WebGL text rendering**: best fidelity, but loses native text
  semantics and costs GPU in the stream worker.
- **Pre-rendered images of headings**: not dynamic, not accessible.
- **CSS `mask-image` grain only**: cheap, but no edge bleed or warp. Could
  serve as a fallback if filters ever cost too much.
- **Phase-aligned in-filter paper blend** (original spec): `feImage` user space
  is per element, so alignment with the CSS background can't be guaranteed.
  Multiply blending gets the same result for free.
