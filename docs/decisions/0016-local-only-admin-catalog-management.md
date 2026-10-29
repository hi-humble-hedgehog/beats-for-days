# 0016. Local-only admin catalog management

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

Managing audio tracks currently requires running manual SQL queries or editing `catalog.json` and running `pnpm db:seed`.
To streamline sound design and track curation, operators need a local administrative interface to:

1. Upload new `.m4a` boom bap tracks into the storage bucket.
2. Edit track metadata (BPM, key, genre, sample-accurate loop points).
3. Disable underperforming or draft tracks without deleting historical data.

This interface must never be exposed on public production deployments.

## Decision

We will build a local-only catalog management interface at `/admin` backed by `/api/admin/tracks`.

### 1. Local-Only Boundary

- In production (`NODE_ENV === "production"`), `/admin` and all `/api/admin/**` endpoints immediately return `404 Not Found`.
- In development and staging (`NODE_ENV !== "production"`), the dashboard is accessible without external auth setup.

### 2. Track Soft-Disable (`is_active`)

- We add `is_active boolean not null default true` to `public.tracks`.
- Public stream queries (`fetchBeatViews`) filter for `is_active = true`.
- Directed graph transition logic automatically prunes transitions connected to inactive tracks to prevent 404s or playback stalls.
- The admin view lists both active and inactive tracks with a one-click toggle switch.

### 3. Audio Asset Ingestion & Auto-Duration

- Uploads accept AAC `.m4a` files with `audio/mp4` MIME type.
- The client decodes the file with Web Audio `AudioContext.decodeAudioData()` to pre-fill the exact `duration_ms` and calculate suggested loop boundaries.
- The server stores the audio in Supabase Storage (`audio` bucket under `tracks/<id>.m4a`) using the service role client.

## Consequences

- Operators can upload, edit, and toggle tracks without database tools or terminal commands.
- Disabled tracks preserve historical play records and can be re-enabled at any time.
- Production is protected by a strict route-level environment check.
- Follow-up: future multi-user production admin access will require adding Supabase Auth role-based access control (RBAC).

## Alternatives considered

- **Public admin protected by password/cookie:** Adds secret-rotation overhead and attack surface for an app that only needs administrative changes during curation.
- **Supabase Dashboard only:** Supabase Dashboard does not compute Web Audio loop points or validate boom bap timing constraints.
