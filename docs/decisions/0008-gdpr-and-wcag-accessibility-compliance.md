# 0008. Enforce GDPR privacy and WCAG 2.2 AA accessibility compliance

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Beats for Days is a public web app with continuous audio and canvas visualizers. Without clear rules, audio and visual web apps often fail in two ways:

1. **Privacy (GDPR / ePrivacy):** Leaking visitor IP addresses or personal data through third-party CDNs, tracking cookies, browser storage, or external API calls.
2. **Accessibility (WCAG 2.2 AA):** Building custom audio players and visualizers that keyboard or screen-reader users cannot operate, or that flash rapidly.

## Decision

We enforce **GDPR privacy by design** and **WCAG 2.2 Level AA accessibility** on every route and feature.

### 1. GDPR & Privacy by Design

- **No tracking cookies by default:** Never load cookie-based analytics, ad pixels, or fingerprinting scripts without prior opt-in consent.
- **Cookieless metrics only (no banner needed, listed in `/privacy`):**
  - **Vercel Web Analytics (`@vercel/analytics`):** Counts pageviews and referrers without cookies or `localStorage`. Short-lived session hashes expire after 24 hours.
  - **Anonymous skip events (`public.track_skip_events`):** Logs only `{ track_id, skipped_at_sec, loop_count }` in Supabase. Never log IP addresses, User-Agents, or user IDs.
- **Essential browser storage only:** Use `localStorage` or `sessionStorage` only for features the user asked for: volume, mute state, `playedTrackIds` play history, reduced-motion setting, or a user-supplied ElevenLabs API key in `sessionStorage`.
- **Self-host all static assets:** Bundle fonts at build time with `next/font` and serve icons and audio from our own domain. Never load assets from third-party CDNs in the browser.
- **No personal data sent to third-party APIs:** Server calls to ElevenLabs, Gemini, or Supabase must never forward visitor IP addresses, cookies, or User-Agent strings.
- **Legal pages & user rights:** Keep `/privacy` and `/about` reachable from every page without stopping audio playback. Support data export and deletion whenever we store personal data (such as waitlist emails).

### 2. Accessibility (WCAG 2.2 Level AA)

- **Semantic HTML:** Use `<header>`, `<nav>`, `<main>`, `<footer>`, ordered headings (`<h1>`–`<h6>`), and native `<button>`, `<input>`, and `<a>` elements.
- **Full keyboard support:** Every control must work with a keyboard (`Tab`, `Shift+Tab`, `Space`, `Enter`, arrow keys, `Escape`) and show a clear `:focus-visible` ring.
- **Screen-reader friendly audio controls:** Give player buttons and sliders clear ARIA labels and values (`aria-label`, `aria-pressed`, `aria-valuetext`). Announce track changes with `aria-live="polite"`.
- **Contrast & target size:** Keep text contrast ≥ 4.5:1 (≥ 3:1 for large text and icons). Make buttons and controls at least 24×24 CSS pixels.
- **Safe motion:** Honour `prefers-reduced-motion: reduce` by pausing or slowing animations. Never flash visualizers more than 3 times per second. Mark decorative `<canvas>` elements with `aria-hidden="true"`.

## Consequences

- GDPR and WCAG 2.2 AA checks are part of the Definition of Done in `AGENTS.md`.
- Component tests (`*.test.tsx`) find elements with `getByRole` instead of test IDs or CSS selectors.
- Adding any new external service, storage key, or analytics tool requires an ADR.

## Alternatives considered

- **Fixing privacy and accessibility right before launch:** Harder and more expensive to retrofit into custom audio players and visualizers.
- **Adding a cookie banner instead of cutting trackers:** A banner adds UI friction and still does not fix CDN IP leaks or server-side data leaks.
