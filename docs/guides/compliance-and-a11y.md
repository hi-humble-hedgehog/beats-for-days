# Privacy (GDPR) & Accessibility (WCAG) Guide

Why we enforce this: [ADR 0008](../decisions/0008-gdpr-and-wcag-accessibility-compliance.md).

Beats for Days is **GDPR compliant by design** and targets **WCAG 2.2 Level AA** accessibility across all routes, audio controls, and visualizers.

## GDPR & Privacy Checklist

1. **Data minimization & cookieless telemetry by default**
   - Do not add cookie-based third-party analytics, marketing pixels, or cross-site tracking scripts without an ADR and an explicit, prior opt-in consent mechanism (with an equally easy reject/withdraw flow).
   - **Approved cookieless telemetry (no cookie banner required, disclosed in `/privacy`):**
     - **Vercel Web Analytics (`@vercel/analytics`):** Basic aggregate pageview/referrer metrics (stores zero cookies/localStorage; daily rotating hash expires after 24h).
     - **Anonymous first-party skip metrics (`public.track_skip_events`):** Stores only `{ track_id, skipped_at_sec, loop_count }` in Supabase with zero IP addresses, User-Agents, or user/session IDs.
2. **No client-side IP leaks**
   - Never load fonts, stylesheets, scripts, or audio assets directly from third-party CDNs in the browser (`fonts.googleapis.com`, `unpkg.com`, etc.).
   - Use `next/font` so fonts are downloaded at build time and served from our own origin.
3. **Client storage (`localStorage` / `sessionStorage` / cookies)**
   - Only store strictly necessary state required for user-requested features: volume level, mute state, `playedTrackIds` (LRU song history so the radio player does not repeat tracks), reduced-motion preference, or `sessionStorage` BYOK API key.
   - Never store raw PII or cross-session tracking identifiers without explicit consent.
4. **Server-side API boundaries**
   - Route handlers (`src/app/api/**`) and server clients (`src/lib/elevenlabs/`, `src/lib/supabase.ts`) must never forward visitor IP addresses, cookies, or personal identifiers to external AI or media providers.
5. **User rights & legal routes**
   - Keep legal/transparency pages (`/terms-of-service`, `/privacy`, `/about`) reachable from every route and playable without interrupting audio.
   - Any feature that persists user-identifiable data must ship with data export (Article 20) and account/data erasure (Article 17) capabilities.

## Accessibility (a11y / WCAG 2.2 AA) Checklist

1. **Semantic HTML & landmarks**
   - Structure pages with `<header>`, `<nav>`, `<main>`, and `<footer>`.
   - Maintain a logical heading hierarchy (`<h1>` once per view, followed by `<h2>`, `<h3>` without skipping levels).
   - Use native `<button>`, `<a>`, and `<input type="range">` elements instead of clickable `<div>` or `<span>` elements.
2. **Keyboard navigation & focus management**
   - Every interactive control must be operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys for sliders, `Escape` to close overlays).
   - Never remove focus outlines (`outline-none`) without providing a high-contrast `:focus-visible` replacement (e.g. `focus-visible:ring-2`).
   - Avoid global single-key shortcuts that hijack typing unless scoped or disabled when focus is inside an input/interactive control (WCAG 2.1.4).
3. **Web Audio player & transport controls**
   - Toggle buttons (Play/Pause, Mute/Unmute) must expose a clear accessible name (`aria-label`) or state (`aria-pressed`).
   - Range sliders (volume, scrubber/progress) must expose `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and human-readable `aria-valuetext` (e.g. `"75%"` or `"1 minute 20 seconds"`).
   - Announce track transitions and loading/error states using an `aria-live="polite"` region so screen reader users know what is playing without focus being stolen.
   - Never autoplay audio on initial page load without explicit user interaction (WCAG 1.4.2).
4. **Visualizers, motion & photosensitivity**
   - Respect `prefers-reduced-motion: reduce` in both CSS (`motion-reduce:*`) and JavaScript (`window.matchMedia("(prefers-reduced-motion: reduce)")`). When reduced motion is active, pause or throttle canvas/WebGL animations to a static or gentle frame.
   - Ensure reactive beat visualizers never flash more than **3 times per second** (WCAG 2.3.1 Three Flashes or Below Threshold).
   - Mark purely decorative `<canvas>` elements with `aria-hidden="true"` while ensuring track metadata and playback status are available in the DOM.
5. **Contrast, sizing & zoom**
   - Normal text contrast ≥ **4.5:1**; large text and active UI controls/icons ≥ **3:1**.
   - Interactive pointer targets must be at least **24×24 CSS pixels** (prefer **44×44 CSS pixels** for primary transport controls).
   - Layouts must reflow cleanly at 200% browser zoom and down to 320px viewport width without horizontal scrolling or clipped controls.
