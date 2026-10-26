# 0010. Deliver next beat via history-based graph API

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Beats for Days streams infinite 90s boom bap audio. Previously, `/api/beats` returned the full catalog sorted with `epochShuffle` and a random `order_hash`.

This full-catalog shuffle caused three architectural problems:

1. **Catalog scaling:** Downloading and parsing up to 1,500 tracks in a single JSON payload degrades mobile performance and Core Web Vitals.
2. **Conflict with transition graph policy:** [ADR 0009](0009-beat-generation-access-and-queue-policy.md) dictates dynamic graph traversal between tracks rather than a pre-determined linear playlist.
3. **Dead client code:** The client player already bypassed the pre-shuffled order to run dynamic graph track selection, making `order_hash` and `epochShuffle` obsolete.

## Decision

We will deliver tracks on demand through a history-based API endpoint (`POST /api/beats/next`).

### 1. `POST /api/beats/next` Request & Response

The client sends its recent listening history and current track:

```json
{
  "currentTrackId": "0042",
  "playedTrackIds": ["0001", "0015", "0042"],
  "mode": "auto"
}
```

The server returns the resolved next beat and transition audio:

```json
{
  "beat": {
    "id": "0108",
    "name": "Brooklyn Dusk",
    "audioUrl": "https://.../audio/0108.mp3",
    "transitions": []
  },
  "transition": {
    "id": "tr-0042-0108",
    "targetTrackId": "0108",
    "audioUrl": "https://.../transitions/0042-0108.mp3"
  }
}
```

### 2. Server-side Graph Resolution

The server evaluates the 3-step transition graph rules from [ADR 0009](0009-beat-generation-access-and-queue-policy.md):

- **Step 1 (Unheard transition):** Return an existing saved transition from `currentTrackId` to an unheard track ($0 cost). If multiple unheard exits exist, pick one uniformly at random.
- **Step 2 (New candidate):** If below the outgoing transition cap, return an unheard track with lowest `in_degree`. If multiple candidates share the lowest `in_degree`, pick one uniformly at random.
- **Step 3 (LRU fallback):** Fall back to the transition whose target was played longest ago in `playedTrackIds`.
- **Skip mode:** If `mode === "skip"` or no transition exists, pick an unheard track at random with `transition: null`.
- **Track identity:** Traversal and history matching evaluate `targetTrackId` exclusively rather than display names, keeping graph resolution robust against metadata or label changes.

### 3. Cookieless Privacy & Statelessness ([ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md))

- **Zero cookies or sessions:** The server processes `playedTrackIds` strictly in-memory during the request.
- **Zero user tracking:** We never store or correlate listen history with IP addresses or user identifiers.
- **LRU window:** The browser limits `playedTrackIds` in `localStorage` to the most recent 50–100 tracks.

## Consequences

- The client downloads only the current and next track (~1 KB each), eliminating full-catalog downloads.
- `order_hash`, `cycle`, and `epochShuffle` in `/api/beats` are deprecated and removed.
- Audio playback preloads the next track at the 30-second mark of each 60-second loop for gapless transitions.
- Client audio player state becomes simpler and resilient across browser reloads.

## Alternatives considered

- **Full catalog download with client-side shuffle:** Downloading 1,500 tracks (~750 KB JSON) degrades bandwidth and memory on mobile devices.
- **Cookies or server-side sessions:** Violates the zero-cookie policy in [ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md) and requires stateful infrastructure.
