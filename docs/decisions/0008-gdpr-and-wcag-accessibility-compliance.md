# 0008. Enforce GDPR privacy and WCAG 2.2 AA accessibility compliance

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Beats for Days is a public-facing web application featuring continuous audio playback and reactive canvas/WebGL visualizers. Without explicit guardrails, media-heavy web apps frequently regress on two fronts:

1. **Privacy (GDPR / ePrivacy):** Unintentionally leaking visitor IP addresses or personal data (PII) via third-party CDNs, unconsented analytics, persistent client storage, or outbound generative API requests.
2. **Accessibility (WCAG 2.2 AA):** Building custom audio transport controls, canvas visualizers, and keyboard shortcuts that are inoperable via screen readers or keyboards, or that trigger vestibular/photosensitive reactions.

## Decision

We will enforce **strict GDPR compliance (privacy by design)** and **WCAG 2.2 Level AA accessibility** across all features, routes, and third-party integrations:

### 1. GDPR & Privacy by Design

- **Zero cookie/profiling trackers by default:** No cookie-based analytics, marketing pixels, cross-site trackers, or persistent device fingerprinting may load without prior, explicit, granular opt-in consent.
- **Cookieless aggregate telemetry (no banner required, disclosed in `/privacy`):**
  - **Vercel Web Analytics (`@vercel/analytics`):** Permitted for basic first-party pageview/referrer stats because it sets zero cookies or client storage and discards short-lived session hashes after 24 hours (GDPR Art. 6(1)(f) legitimate interest / ePrivacy-exempt).
  - **Anonymous track skip telemetry (`public.track_skip_events`):** Permitted for recording `{ track_id, skipped_at_sec, loop_count }` in Supabase with zero IP addresses, User-Agents, or session/user identifiers stored (GDPR Recital 26 anonymous data).
- **Strictly necessary storage only:** Essential client state (e.g. volume, muted state, `playedTrackIds` LRU history for non-repeating radio playback, reduced-motion preference, or `sessionStorage` BYOK API key) may only use local storage when directly supporting user-requested functionality, and must be documented.
- **No third-party asset leaks:** Fonts (bundled at build time via `next/font`), icons, and static media must be self-hosted or served from first-party origins so visitor IPs are not leaked to external CDNs on page load.
- **PII-free third-party API calls:** Server-side calls to external services (ElevenLabs, Gemini, Supabase) must never forward end-user IP addresses, raw user-agent strings, or unconsented personal identifiers.
- **Transparency & user rights:** Maintain clear, accessible Privacy Policy and Terms of Service routes detailing any data processing, storage, and sub-processors (including Vercel Web Analytics). Whenever user accounts or persisted user data are introduced, provide self-service data export (portability) and deletion (erasure) flows.

### 2. Accessibility (a11y / WCAG 2.2 Level AA)

- **Semantic HTML & landmarks:** Every route must use proper document structure (`<main>`, `<nav>`, `<header>`, `<footer>`, sequential headings `<h1>`–`<h6>`) and native interactive elements (`<button>`, `<input>`, `<a>`) before reaching for custom ARIA.
- **Full keyboard operability:** All interactive controls (transport, volume sliders, track selectors, modals) must be reachable and operable via keyboard alone (`Tab`, `Shift+Tab`, `Space`, `Enter`, arrow keys, `Escape`) with visible `:focus-visible` indicators and no keyboard traps.
- **Accessible audio controls & live announcements:** Custom player controls must expose accurate roles, labels, and states (`aria-label`, `aria-pressed`, `aria-valuemin`/`max`/`now`/`text`). Dynamic track/playback changes must be announced non-disruptively via `aria-live="polite"`.
- **Visual contrast & target sizing:** Text and interactive UI icons must meet WCAG AA contrast ratios (≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components) and minimum pointer target sizes (≥ 24×24 CSS pixels).
- **Motion & photosensitivity safety:** All visualizers and animations must respect `prefers-reduced-motion: reduce` (providing a static or low-motion fallback) and never flash more than 3 times per second (WCAG 2.3.1). `<canvas>` elements must include descriptive fallback/accessible labels or `aria-hidden="true"` when purely decorative alongside accessible text equivalents.

## Consequences

- Agents and developers must treat GDPR and WCAG 2.2 AA checks as part of the Definition of Done in `AGENTS.md`.
- Component tests (`*.test.tsx`) must query elements by accessible role and accessible name (`getByRole(..., { name })`) rather than test IDs or CSS selectors.
- Introducing any new external service, storage mechanism, or analytics tool requires an ADR evaluating its GDPR sub-processor and data-flow impact.

## Alternatives considered

- **Retrofitting compliance before launch:** Expensive and error-prone, especially for custom Web Audio players, canvas visualizers, and third-party integrations.
- **Relying solely on automated cookie banners:** Does not solve IP leaks from third-party assets, server-side PII forwarding, or architectural data minimization.
