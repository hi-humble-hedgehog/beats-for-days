# 0011. Local static audio asset delivery

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Beats for Days streams continuous boom bap audio and gapless transitions.
Previously, the initial schema assumed all audio files were hosted in Supabase Storage (`storage.objects`) and served via Supabase public bucket URLs.

Relying on Supabase Storage for local development created friction:

1. Developers needed seed audio files uploaded to a Supabase Storage bucket or cloud bucket access to hear audio during `pnpm dev`.
2. Tests required mocking storage client methods or faking bucket responses.
3. Audio asset serving was tied to cloud bucket availability.

## Decision

We will support direct static serving from Next.js `public/audio/` for local development and fallback offline environments, while preserving Supabase Storage for cloud production.

### 1. Unified Audio Asset Resolution

`fetchBeatViews` in `src/lib/tracks.ts` and the seed pipeline resolve audio paths as follows:

- **Production (`NODE_ENV=production`):** `USE_LOCAL_AUDIO` defaults to `false`. Audio paths resolve to Supabase Storage URLs (public CDN or short-lived signed URLs from a private bucket).
- **Local Dev and Tests (`NODE_ENV !== "production"`):** `USE_LOCAL_AUDIO` defaults to `true`. Audio paths resolve to `/audio/...` mapped to `public/audio/`.
- **Storage Client Fallback:** If the Supabase storage client is absent (`!client?.storage`), asset resolution falls back to local `/audio/...` paths.
- **Explicit Override:** Operators can explicitly set `USE_LOCAL_AUDIO=true` or `USE_LOCAL_AUDIO=false` in `.env` to override the environment default.
- **Database Seeding (`pnpm db:seed`):** Seeds relative paths (`tracks/<file>.m4a`, `transitions/<file>.m4a`) into database tables and uploads assets to the Supabase `audio` bucket.

Track and transition metadata queries still depend on a running local Supabase container (`supabase start`). If the local database is absent or unreachable, metadata queries fail as expected.

### 2. Format Optimization (AAC .m4a at 192 kbps)

Starter and seed assets are compressed from uncompressed 16-bit PCM `.wav` into AAC (`.m4a`):

- **Why AAC (.m4a):** Avoids MP3 encoder padding/delay that shifts loop points, provides universal decoding across Safari/iOS/Chrome, and reduces bandwidth by ~88% (a 12 MB WAV becomes ~1.4 MB).
- **Streaming optimization:** Encoded with `-movflags +faststart` using `ffmpeg` via `pnpm audio:convert` (`scripts/audio/convert.ts`).
- **Timing accuracy:** Preserves sample-accurate loop boundaries (`loopStartMs`, `loopEndMs`) for seamless Web Audio looping (see [audio engine architecture](../architecture/audio-engine.md)).
- **Delivery mode:** Audio assets can be served via static file resolution or streamed through Next.js route handlers (`/api/stream/...`) to obfuscate raw file paths.

### 3. Privacy & Offline Compliance (ADR 0008)

Serving static audio from `public/audio/`:

- Prevents user IP leaks to third-party CDNs.
- Requires zero cookies, auth tokens, or headers.
- Works fully offline in local dev environments.

## Consequences

- Running `pnpm dev` serves audio from local static files without requiring Supabase Storage buckets or cloud credentials.
- Local development and test environments still require a running local Supabase instance (`supabase start`) for metadata and transition graph rows.
- Fast local audio loading speeds with zero network latency.
- Production uses Supabase Storage public CDN URLs by default, with zero frontend changes.
