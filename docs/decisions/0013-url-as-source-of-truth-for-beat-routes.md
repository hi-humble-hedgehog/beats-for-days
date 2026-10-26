# 0013. URL as single source of truth for beat routes

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Beats for Days plays continuous hip hop beats on `/beat/[slug]` routes.

Previously, track advance updated the browser URL with `window.history.pushState`.
However, neither `AudioPlayerContext` nor `BeatPage` responded to browser history changes.
When a user clicked Chrome's Back or Forward buttons:

1. The URL in the address bar changed.
2. The UI and audio player remained stuck on the previous track.
3. Visiting a specific beat URL directly did not load that beat.

We need the URL to be the single source of truth for the active beat on beat routes.

## Decision

We will make the route URL the single source of truth for track playback on beat routes.

### 1. Bidirectional URL and Player Synchronization

- **On beat routes (`/beat/:slug`):** The URL slug dictates which beat is active in UI and audio.
- **Track advance (Engine ➔ URL):** When a track changes naturally or by skipping, the player updates the URL to `/beat/:nextId`.
- **History navigation (URL ➔ Engine):** When the user navigates back or forward, the player detects the route change. If the target beat differs from the active track, the player loads that track and switches playback.
- **Non-beat routes (`/about`, `/generate`):** Background audio continues playing without modifying the URL.
- **Root route (`/`) and 404 routes:** Returning to the landing page or landing on an unknown beat ID pauses playback. Pressing Play on either route (via the page button or the persistent player bar) calls `resolveStartBeat`: it resumes the paused beat if playback had already started in the session, or calls `POST /api/beats/next` with the current track ID and play history and navigates to `/beat/:nextId`.

### 2. On-Demand Beat Retrieval

- Extend `GET /api/beats?id=:id` to fetch a single beat view by ID.
- Add `beatsApi.getBeat(id)` to query the active beat on cold load or history jump.
- Render a 404 Not Found state when a requested beat ID is invalid or missing, pausing playback instead of silently falling back.

## Consequences

- Browser Back and Forward navigation changes both the UI and audio playback immediately.
- Users can bookmark or share direct links to specific beats (e.g., `/beat/0042`).
- The player state remains synchronized with Next.js App Router navigation.
- Cold starts on `/beat/:slug` fetch only the requested track metadata (~1 KB) instead of full catalogs.

## Alternatives considered

- **Keep audio decoupled from the URL** — Breaches user expectations when using standard browser navigation.
- **Full page navigation on track advance (`router.push`)** — Triggers unnecessary React tree rerenders and can cause audio micro-stutters.
