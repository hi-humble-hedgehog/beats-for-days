# 0009. Enforce phased beat generation access, deferred waitlist redemption, and on-the-fly transition graph playback

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Generating a custom boom bap track and transition bridge via ElevenLabs (`music_v2_5`) and Google Gemini incurs direct per-generation API costs. Opening unthrottled public generation would expose the platform to runaway API spend, while generating tracks speculatively in background queues would waste funds on users who never check their email. Additionally, pre-rendering a full $N \times (N - 1)$ transition matrix across hundreds of tracks would scale quadratically ($O(N^2)$), while rigid track batches would force listeners into fixed, repeating playlists.

## Decision

We will roll out in **two phases** (Phase 1: seeded radio player + waitlist signup; Phase 2: 4-tier public beat generation on `/generate`), backed by an **on-the-fly directed transition graph** capped per track:

### 1. Phased Rollout & Four-Tier Access (`/generate`)

- **Phase 1 MVP (Radio + Waitlist Signup Only):**
  - Launches with **30–40 curated 1-minute infinitely loopable seed beats** on `/` and `/beat/####`.
  - `/generate` collects email waitlist signups to notify users when public beat generation opens (no live user beat generation or checkout enabled yet).
- **Phase 2 (4-Tier Generation on `/generate`):**
  1. **Tier A — 24/7 Radio Stream (`/`):** Free passive playback of pre-generated tracks and cached transitions.
  2. **Tier B — Free Email Waitlist (`/generate`):**
     - Capped at **1,500 free invites** per batch, displayed publicly (`"X of 1,500 free invites remaining"`). Sending an invite holds 1 slot; if the invite expires unused after 48 hours, the slot returns (`+1`) to the remaining pool.
     - Dispatched at an average pace of up to **48 invites/day**, enforcing at least a **23-hour wait** after email verification and delivered in an hourly batch at **12:00 PM in the user's local timezone** (captured via `Intl.DateTimeFormat`).
     - Users see only their **estimated invite date and time** ($\text{days\_out} = \max(1, \lceil N / 48 \rceil)$ at 12:00 PM local time), never their numeric position in line.
     - Re-entering an email on `/generate` or clicking the verification link (`/generate?verify=TOKEN`) displays the current estimated invite date.
  3. **Tier C — Paid Instant Pass (`/generate`):**
     - Allows skipping the waitlist via a payment platform checkout.
     - Issues a unique per-order token via webhook / license key that both redirects the browser to `/generate?invite=TOKEN` and is emailed to the buyer's checkout address so paid passes are never lost if a browser tab closes.
     - Capped at **5 generations per day per checkout email** (avoiding IP-based caps that block shared Wi-Fi or mobile CGNAT).
  4. **Tier D — Bring Your Own Key (BYOK, `/generate`):**
     - Users supply their own `ELEVENLABS_API_KEY`. The raw key is stored strictly in browser `sessionStorage` and sent via request header.
     - The server hashes the key with `HMAC-SHA256` to enforce a **5 generations per day cooldown per key** without persisting raw keys ([ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md)).

### 2. Deferred Generation & Error-Safe State Machine

- **Zero speculative generation:** Audio is never generated in background cron jobs. Opening `/generate?invite=TOKEN` only unlocks the studio controls.
- **Atomic redemption & retry:** Clicking **Generate Beat** transitions the invite from `invited` to `redeeming` (locking against double-clicks) and then `redeemed` on success. If an external API fails, the invite enters `failed`, preserving the token so the user can click **Try Again**.
- **Expiration & re-entry:** Unused invites expire after 48 hours (`expired`) at zero cost. Returning after an expired invite grants a one-time priority bump (`is_priority_bump = true`) to the front of the waitlist. Returning after a `redeemed` invite allows rejoining at the back of the waitlist (enforced via a partial unique index allowing one active waitlist entry per normalized email).

### 3. On-the-Fly Directed Transition Graph & 1-Minute Loop Playback

- **Sequential `/beat/####` IDs:** Every beat is assigned the next sequential 4-digit ID (`/beat/0001`, `/beat/0002`, …, `/beat/1500`).
- **1-minute infinitely loopable tracks:** All beats are ~1 minute long (`loop_start_ms` $\to$ `loop_end_ms`).
- **Client LRU song history (`playedTrackIds`):** The browser stores a deduplicated `playedTrackIds` array (ordered oldest $\to$ newest) in `localStorage`. When a track plays, it is moved/appended to the newest end of `playedTrackIds`.
- **Natural radio transition (after Loop 1 completes):**
  - AI transition blends only occur during continuous radio listening (never on manual skip).
  - Once **Loop 1 finishes (`t = 60s`)**, the player enters Loop 2 and resolves the next transition from the current track (`Track A`):
    1. If `public.transitions` already has one or more outgoing transitions from `Track A` pointing to a `to_track_id` **not** in `playedTrackIds`, pick one at random (`$0` cost).
    2. Otherwise, if `Track A` is below its outgoing cap (**max 8 out** in Phase 1; configurable e.g. **3–6** for Phase 2 tracks) and an unheard track `Track B` exists below its incoming cap (**max 8 in** in Phase 1), the server selects the unheard `Track B` with the **lowest `in_degree`**, generates the `A -> B` transition on the fly, and persists it to `public.transitions`. `Track A` continues looping seamlessly until the transition buffer is ready, then blends in at the end of the current loop.
    3. Otherwise (if `Track A` has reached its outgoing cap or all unheard tracks have reached their incoming cap), pick the existing outgoing transition from `Track A` whose `to_track_id` is **oldest** in `playedTrackIds` (`$0` cost).
- **Manual skip & anonymous telemetry:**
  - Clicking **Skip / Next** performs a client-side Web Audio transition into an unheard track at `$0` API cost (never triggering an ElevenLabs transition generation).
  - Each manual skip logs an anonymous row `{ track_id, skipped_at_sec, loop_count }` to `public.track_skip_events` (with zero IP/session identifiers per [ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md)).

## Consequences

- Zero wasted API spend on unclicked invites or early track skips (transitions only generate after Loop 1 completes, and are permanently cached up to the per-track degree cap).
- No `track_batches` tables or rigid multi-stage slot caps are needed; `public.tracks` and `public.transitions` form a self-balancing directed graph where newly added tracks (`in_degree = 0`) are automatically prioritized.
- Queue state transitions, wait-date math, and graph transition selection must live in pure `.ts` modules under `src/lib/` with full unit and mutation test coverage ([ADR 0003](0003-testing-strategy.md)).

## Alternatives considered

- **Background pre-generation when a waitlist turn arrives:** Rejected because unclicked emails would waste API spend per ignored invite.
- **Full all-pairs ($N \times (N - 1)$) transition matrix:** Rejected because transition costs scale quadratically ($O(N^2)$) as the catalog grows toward 1,500 tracks.
- **Fixed 10-track batches with stratified slot caps:** Rejected in favor of the capped on-the-fly directed graph (`max 8 in / 8 out`), which avoids rigid repeating chains and eliminates batch-management schema complexity.
- **Storing paid passes solely in browser `localStorage`:** Rejected because clearing site data or closing private tabs causes lost passes and support friction.
