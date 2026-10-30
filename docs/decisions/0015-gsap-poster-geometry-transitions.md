# 0015. Use GSAP for continuous geometric morph of poster visualizer

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

When switching tracks, the visualizer seed changes. This alters ring radii,
visible spans, and marker bar angles. Snapping immediately between states
created an abrupt visual jump that broke the hypnotic vinyl player experience.

## Decision

We will use GSAP to drive a continuous geometric morph between tracks:

1. **Pure geometry interpolation (`src/lib/grid/poster-transition.ts`)**
   - Pure, unit-tested math functions (`interpolateGeometry`, `interpolateCut`).
   - Linearly interpolates radii, angular spans, title cutouts, and inner bars.
   - Smoothly opens and closes cutouts from their centers.

2. **GSAP-driven hook (`src/components/grid/usePosterGeometry.ts`)**
   - Sweeps progress from 0 to 1 over 0.7s with `power2.out` easing.
   - Respects WCAG 2.2 AA: snaps instantly when `prefers-reduced-motion` is active.
   - Gracefully interrupts mid-flight tweens on rapid skips.

3. **Coordinated visualizers**
   - Both `SpectrumBars` and `VinylVisualizer` share the interpolated geometry.
   - Red marker bars and black vinyl rings morph in unison without detaching.

## Consequences

- **Easier:** Pure geometric interpolation is decoupled from canvas rendering and
  tested in Node without browser mocks.
- **Easier:** Both canvas visualizers receive intermediate geometry seamlessly
  without altering their internal drawing loops.
- **Easier:** Rapid skipping interrupts smoothly with zero visual stutter.
- **Harder:** Adds `gsap` as a production dependency.
- **Harder:** Viewport resize bypasses animation to keep window dragging crisp.

## Alternatives considered

- **Native RAF lerp in TypeScript** — viable, but GSAP provides battle-tested
  easing curves and tween interruption out of the box.
- **Morphing only `SpectrumBars`** — leaves marker bars detached from the first
  vinyl ring during the transition.
- **Canvas opacity crossfade** — produces a double-image ghosting effect instead
  of a clean Swiss geometric transformation.
