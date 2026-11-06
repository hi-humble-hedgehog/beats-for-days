# 0019. Inline semantic CSS for the main app and isolate Tailwind to admin

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

The public application is a single persistent Swiss poster player (`PosterPlayer`) where layout geometry is computed in TypeScript (`src/lib/grid/poster-geometry.ts`) and drawn on HTML `<canvas>` and `<svg>` elements.

Previously, `src/app/globals.css` imported Tailwind CSS v4 globally, and `src/app/layout.tsx` used an inline `<style dangerouslySetInnerHTML>` workaround to prevent a white color flash before the external stylesheet loaded. Nearly 60% of all Tailwind utility usage in the repository lived in the local-only `/admin` catalog dashboard rather than the public player.

## Decision

We will split styling between the public player and the local admin tool, and inline CSS in compiled HTML:

1. **Global tokens in `src/app/globals.css` and co-located CSS Modules (`.module.css`)**
   - Remove `@import "tailwindcss"` from `src/app/globals.css`.
   - Keep `src/app/globals.css` strictly for global OKLCH palette tokens, `@layer base` element resets, `.site-root`, `.site-body`, `.sr-only`, `.tabular-nums`, and reduced-motion rules.
   - Define component-specific styles in co-located CSS Modules (`PosterPlayer.module.css`, `BeatNumber.module.css`, `PosterInfoSlot.module.css`, `TransportControls.module.css`, `DebugPanel.module.css`, `Grid.module.css`) using native CSS nesting (`&:hover`, `&:focus-visible`, `@media`).
   - Remove the manual `<style>` workaround from `src/app/layout.tsx`.

2. **Inline compiled CSS in `<head>` (`next.config.ts`)**
   - Enable `experimental.inlineCss: true` in `next.config.ts`.
   - Next.js injects the compiled stylesheet directly into `<head>` in production HTML responses, eliminating render-blocking `<link>` requests and preventing color flashes on first paint.

3. **Scope Tailwind CSS v4 exclusively to `/admin` (`src/app/admin/admin.css`)**
   - Move `@import "tailwindcss"` and `@theme inline` into `src/app/admin/admin.css`, imported only by `src/app/admin/page.tsx`.
   - Scope the `@tailwindcss/turbopack` rule in `next.config.ts` to `admin.css` and scan only `src/app/admin` and `src/components/admin`.

## Consequences

- **Easier:** First-load HTML includes all public styles (~5 KB) inline in `<head>`, guaranteeing zero flash of unstyled content without `dangerouslySetInnerHTML`.
- **Easier:** Each public component owns its styles in a co-located `.module.css` file with locally scoped class names (`styles.stage`, `styles.trackNumber`) and native CSS nesting.
- **Easier:** Local `/admin` development keeps Tailwind utilities for rapid table, form, and modal iteration without bloating the public app.
- **Harder:** New public UI components must define styles in a co-located `.module.css` file instead of using Tailwind utilities.

## Alternatives considered

- **Keep Tailwind globally with `inlineCss: true`** — rejected because the public poster layout already computes geometry in TypeScript and does not need Tailwind's Preflight or utility bundle.
- **Remove Tailwind from `/admin` as well** — rejected because utility classes make local admin tables, forms, and modals faster to build and modify agentically.
