# Privacy (GDPR) & Accessibility (WCAG) Guide

Why we enforce this: [ADR 0008](../decisions/0008-gdpr-and-wcag-accessibility-compliance.md).

Beats for Days is **GDPR compliant by design** and targets **WCAG 2.2 Level AA** accessibility across all routes, audio controls, and visualizers.

## GDPR & Privacy Checklist

1. **Collect minimal data & use cookieless metrics**
   - Do not add cookie-based analytics, ad pixels, or cross-site trackers without an ADR and an opt-in consent banner (with an equally easy reject button).
   - **Approved cookieless metrics (no banner needed, listed in `/privacy`):**
     - **Vercel Web Analytics (`@vercel/analytics`):** Counts pageviews and referrers without cookies or `localStorage`. Session hashes rotate daily and expire after 24 hours.
     - **Anonymous skip events (`public.track_skip_events`):** Saves only `{ track_id, skipped_at_sec, loop_count }` in Supabase. Never save IP addresses, User-Agents, or user IDs.
2. **Never leak visitor IPs to third-party CDNs**
   - Never load fonts, stylesheets, scripts, or audio directly from external CDNs in the browser (`fonts.googleapis.com`, `unpkg.com`, etc.).
   - Use `next/font` so fonts download at build time and serve from our own domain.
3. **Browser storage (`localStorage` / `sessionStorage` / cookies)**
   - Store only state needed for features the user asked for: volume, mute state, `playedTrackIds` play history, reduced-motion setting, or a user-supplied ElevenLabs API key in `sessionStorage`.
   - Never store personal data or tracking IDs in browser storage without explicit consent.
4. **Server API routes**
   - Route handlers (`src/app/api/**`) and server clients (`src/lib/elevenlabs/`, `src/lib/supabase.ts`) must never forward visitor IP addresses, cookies, or personal data to external AI or media services.
5. **Legal pages & user rights**
   - Keep `/privacy` and `/about` reachable from every route without stopping audio playback. Legacy `/terms-of-service` and `/privacy-policy` redirect to `/privacy`.
   - Any feature that saves personal data (such as waitlist emails) must support data export (Article 20) and deletion (Article 17).

## Accessibility (WCAG 2.2 AA) Checklist

1. **Semantic HTML & landmarks**
   - Structure pages with `<header>`, `<nav>`, `<main>`, and `<footer>`.
   - Keep headings in order (`<h1>` once per page, then `<h2>`, `<h3>` without skipping levels).
   - Use native `<button>`, `<a>`, and `<input type="range">` elements instead of clickable `<div>` or `<span>` tags.
2. **Keyboard navigation & focus**
   - Every control must work with a keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys for sliders, `Escape` to close popovers).
   - Never remove focus outlines (`outline-none`) without adding a high-contrast `:focus-visible` style (such as `focus-visible:ring-2`).
   - Do not add single-key shortcuts that fire while the user is typing in an input field (WCAG 2.1.4).
3. **Audio player controls**
   - Give toggle buttons (Play/Pause, Mute/Unmute) a clear `aria-label` or `aria-pressed` state.
   - Give range sliders (volume, progress) `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and human-friendly `aria-valuetext` (such as `"75%"` or `"1 minute 20 seconds"`).
   - Announce track changes and loading or error states inside an `aria-live="polite"` region so screen readers report what is playing without stealing focus.
   - Never autoplay audio on page load without a user click (WCAG 1.4.2).
4. **Visualizers & safe motion**
   - Honour `prefers-reduced-motion: reduce` in CSS (`motion-reduce:*`) and JavaScript (`window.matchMedia("(prefers-reduced-motion: reduce)")`). Pause or slow down canvas animations when reduced motion is on.
   - Never flash visualizers more than **3 times per second** (WCAG 2.3.1).
   - Add `aria-hidden="true"` to decorative `<canvas>` elements and keep track titles and status in normal DOM text.
5. **Contrast, target size & zoom**
   - Keep normal text contrast ≥ **4.5:1**, and large text or icons ≥ **3:1**.
   - Annotate every foreground and UI color token in `src/app/globals.css` (defined in `oklch(L C H)`) with its computed contrast ratio (`/* Contrast: X.X:1 vs --bg (level) */`) and verify with `pnpm lint:a11y` (`.agents/skills/born-accessible-ui/`, [ADR 0012](../decisions/0012-playwright-e2e-user-flow-testing.md)).
   - Make clickable targets at least **24×24 CSS pixels** (aim for **44×44 CSS pixels** on main player buttons).
   - Pages must work at 200% browser zoom and down to a 320px screen width without horizontal scrolling or clipped buttons (verified automatically via `pnpm test:e2e` and `pnpm audit:a11y`).
