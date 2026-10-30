# 0014. Use a two-part Swiss grid: Tonhalle poster geometry and editorial columns

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

Beats for Days needs a UI rooted in Swiss International Typographic Style.
Josef Müller-Brockmann's 1955 Tonhalle "Beethoven" poster is the player.
About, terms, privacy, and generate pages need a readable typographic grid.
A V0 prototype proved the poster math. Production must keep that math in
testable `.ts` files and keep the prototype out of lint, typecheck, and knip.

## Decision

We will ship two grids that share tokens, not one morphing engine:

1. **Player poster grid (`src/lib/grid/poster-geometry.ts`)**
   - Pivot sits on a gutter crossing.
   - Concentric bands double in width: 8, 16, 32, 64, 128, 256, 512 px.
   - Angles snap to an 11.25° module (`π / 16`).
   - Title (top left) and player (bottom right) hitboxes cut the rings.
   - Start radius anchors to `min(colW, rowH)` to prevent the center label from ballooning on ultrawide viewports.
   - Outer bands project player UI cuts outward so wide displays preserve constructivist stepped cuts instead of closing into solid circles.
   - Thin canvas and SVG views in `src/components/grid/` draw the result.
   - Persistent layout shell in `AppChrome`: the poster canvas and transport
     stay mounted across all poster routes (`/`, `/beat/*`, `/about`, `/privacy`).
     Only the track number (`PosterTrackNumber`) and page editorial content
     (`PosterInfoSlot`) are swapped as children, eliminating route-change canvas
     flashes.

2. **Editorial grid (`src/components/grid/InfoPage.tsx`)**
   - 6 columns on small viewports, 12 columns from the `md` breakpoint.
   - Used by 404 pages and standalone editorial views. `/about` and `/privacy`
     stay inside the poster player by rewriting the track number slot with a
     two-paragraph summary (`PosterInfoSlot`), keeping audio playback and the
     visualizer continuous.

`docs/inspiration/` stays a reference only. ESLint, TypeScript, and knip
ignore it so prototype files never fail the quality gate.

## Consequences

- **Easier:** Poster cuts, band widths, and format helpers are unit-tested
  and mutation-tested in Node. The overlay and the vinyl share one geometry.
- **Easier:** Editorial pages reuse one header, article, and footer layout.
- **Harder:** Player and editorial grids can drift if tokens change in only
  one place. Keep both on the sleeve / vinyl / stamp palette.
- **Follow-up:** Do not import `docs/inspiration/` from `src/`.

## Alternatives considered

- **One parametric engine that morphs musica-viva, tonhalle, and marber
  modes** — too much surface for the player we are shipping. Poster math
  plus a 6/12 editorial grid covers the routes we have.
- **Keep the V0 prototype on the production path** — its app files would
  trip lint, knip, and Next typecheck. Reference-only is safer.
- **Static Tailwind columns only** — cannot express concentric doubling
  bands or 11.25° hitbox cuts.
