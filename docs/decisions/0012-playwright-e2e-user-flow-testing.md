# 0012. Use Playwright, Born-Accessible UI, and OKLCH tokens for E2E & accessibility verification

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Unit tests (`*.test.ts`) and happy-dom component tests (`*.test.tsx`) verify isolated logic and individual UI components ([ADR 0003](0003-testing-strategy.md)).
However, happy-dom does not run a real browser engine, Next.js App Router server redirects (`/beats` → `/beat/0001`), live route handlers (`/api/beats/next`, `/api/waitlist`), or full multi-page navigation with the persistent audio player bar.

In addition, LLMs and developers often estimate color contrast ratios instead of computing relative luminance, causing subtle WCAG 2.2 AA contrast failures on accent and muted tokens.

We need an automated way to test complete user flows and verify color contrast, semantic controls, and 320px viewport reflow in a real browser against live local API routes and Supabase.

## Decision

We will use **Playwright** (`@playwright/test`), the **Born-Accessible UI** verification kit ([`ginader/born-accessible-ui`](https://github.com/ginader/born-accessible-ui)), and **OKLCH color tokens**:

1. **Test location:** Place E2E test suites in `e2e/*.spec.ts` so they stay separate from Vitest `*.test.{ts,tsx}` files.
2. **Browser target:** Run headless Chromium (`Desktop Chrome`) against `http://localhost:3000`, automatically starting or reusing the local Next.js server (`pnpm dev`).
3. **Live local stack:** Hit live Next.js API routes (`/api/beats/next`, `/api/waitlist`) backed by the local Supabase instance (`supabase start`) and static audio assets in `public/audio/` ([ADR 0011](0011-local-static-audio-asset-delivery.md)).
4. **OKLCH color tokens with computed contrast assertions:**
   - Define the 90s white-label promo-pressing palette using perceptual `oklch(L C H)` values in [`src/app/globals.css`](../../src/app/globals.css) and [`src/lib/design-tokens.ts`](../../src/lib/design-tokens.ts):
     - `--sleeve`: `oklch(0.9369 0.0083 91.49)`
     - `--vinyl`: `oklch(0.1913 0 0)` — `15.3:1` vs `--sleeve` (AAA)
     - `--stamp`: `oklch(0.5371 0.2035 29.91)` — `4.7:1` vs `--sleeve` (AA)
     - `--pencil`: `oklch(0.5102 0.0096 91.57)` — `4.7:1` vs `--sleeve` (AA)
   - Annotate every foreground and UI token in `src/app/globals.css` with a `/* Contrast: X.X:1 vs --bg (level) */` comment.
   - Verify all `oklch(...)` and hex contrast assertions statically via `pnpm lint:a11y` (`.agents/skills/born-accessible-ui/scripts/lint.mjs`).
5. **Core user flows & Born-Accessible checks covered:**
   - **Radio landing & playback:** Starting the stream from `/`, navigating to `/beat/[slug]`, toggling play/pause and skipping tracks in the persistent player bar, and pausing playback when returning to `/`.
   - **Waitlist & generation:** Viewing live invite pool counts on `/generate` and submitting new and duplicate waitlist email signups.
   - **Navigation & static pages:** Verifying `/beats` server redirect and header navigation across `/about`, `/terms-of-service`, and `/privacy-policy`.
   - **Born-Accessible UI & WCAG 2.2 AA (`@axe-core/playwright` + `.agents/skills/born-accessible-ui/`):**
     - Running axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`), `placeholder-only-label` checks, and 320px viewport reflow checks across all routes (`e2e/user-flows.spec.ts` and `pnpm audit:a11y`).
     - Enforcing static contrast assertions and semantic control checks (`clickable-non-semantic`, `role-button`, `outline-removed`) via `pnpm lint:a11y` ([ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md)).
6. **Quality gate integration:** Include `pnpm lint:a11y` and `pnpm test:e2e` in `pnpm verify` so every pre-push check verifies both static contrast assertions and full browser user flows + axe-core checks.

## Consequences

- `pnpm verify` and pre-push hooks now verify static OKLCH contrast claims and real browser user flows + axe-core + 320px reflow end-to-end before code is pushed.
- Local development and pre-push verification require the local Supabase stack (`supabase start`) and Chromium binary (`pnpm exec playwright install chromium`).
- Playwright and Born-Accessible HTML/JSON reports write to `reports/playwright/`, `reports/playwright-results/`, and `reports/a11y/` (git-ignored).
- App code in `src/` cannot import from `e2e/` (enforced by `.dependency-cruiser.cjs`).

## Alternatives considered

- **Cypress** — heavier runner and slower startup compared to Playwright's native WebSocket protocol.
- **Vitest + happy-dom only** — fast for components, but cannot test real Next.js server routing, live API database round-trips, or real browser Web Audio and layout behaviour.
- **Mocking `/api/*` routes in E2E** — faster in environments without Docker, but misses contract drift between Next.js route handlers and the local Supabase schema.
- **Unverified hex color tokens** — easy to write, but harder to tune lightness predictably without shifting hue, and prone to falling below the 4.5:1 AA contrast floor.
