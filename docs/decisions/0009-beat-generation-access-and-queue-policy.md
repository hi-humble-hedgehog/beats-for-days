# 0009. Roll out beat generation in phases and use a capped transition graph

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Generating a custom beat and transition via ElevenLabs and Gemini costs money on every call. We have three cost and playback problems to solve:

1. Opening unthrottled generation to the public would cause runaway API bills.
2. Pre-generating beats in the background would waste money on waitlist users who never open their invite email.
3. Generating transitions between every pair of tracks ($N \times (N - 1)$) grows quadratically as the catalog grows, while fixed track batches trap listeners in repeating playlists.

## Decision

We will roll out in **two phases** and connect tracks through an **on-the-fly transition graph** with a cap on transitions per track.

### 1. Two-Phase Rollout & Four Access Tiers (`/generate`)

- **Phase 1 MVP (Radio Player + Waitlist Signup):**
  - Launches with **30–40 curated 1-minute loopable beats** on `/` and `/beat/####`.
  - `/generate` collects email signups for the waitlist. No live user beat generation or checkout runs in Phase 1.
- **Phase 2 (4-Tier Public Generation on `/generate`):**
  1. **Tier A — 24/7 Radio Stream (`/`):** Free listening using existing tracks and saved transitions.
  2. **Tier B — Free Email Waitlist (`/generate`):**
     - Gives out **1,500 free invites** per batch (`"X of 1,500 free invites remaining"`). Sending an invite holds 1 spot. If an invite expires after 48 hours without being used, the spot returns (`+1`) to the pool.
     - Sends up to **48 invites per day**. Each user waits at least **23 hours** after verifying their email and receives their invite at **12:00 PM in their local timezone** (read from `Intl.DateTimeFormat`).
     - Shows only the **estimated invite date and time** ($\text{days\_out} = \max(1, \lceil N / 48 \rceil)$ at 12:00 PM), never a queue number.
     - Users can check their estimated date anytime by re-entering their email on `/generate` or opening their verification link (`/generate?verify=TOKEN`).
  3. **Tier C — Paid Instant Pass (`/generate`):**
     - Lets users skip the waitlist through checkout.
     - Redirects the browser to `/generate?invite=TOKEN` and emails a backup link to the buyer so they never lose access if they close the tab.
     - Limits each buyer email to **5 beats per day**. We rate-limit by hashed email instead of IP address so shared office or mobile networks are not blocked.
  4. **Tier D — Bring Your Own Key (BYOK, `/generate`):**
     - Users enter their own `ELEVENLABS_API_KEY`. The browser keeps the raw key in `sessionStorage` and sends it via request header.
     - The server hashes the key with `HMAC-SHA256` to enforce a **5 beats per day limit per key** without saving raw keys ([ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md)).

### 2. Generate Only on Click & Handle Errors Safely

- **No background generation:** Cron jobs only send invite emails. Opening `/generate?invite=TOKEN` only unlocks the form.
- **Lock and retry on failure:** Clicking **Generate Beat** changes the invite status from `invited` to `redeeming` (preventing double-clicks) and then `redeemed` when finished. If an API call fails, the status becomes `failed` so the user can click **Try Again** with the same token.
- **Expiry and rejoining:** Unused invites expire after 48 hours (`expired`) at zero cost. If a user returns after an expired invite, they get a one-time bump to the front of the waitlist (`is_priority_bump = true`). If they return after redeeming an invite, they join the back of the waitlist.

### 3. On-the-Fly Transition Graph & 1-Minute Loops

- **4-digit `/beat/####` URLs:** Each beat gets the next 4-digit ID in order (`/beat/0001`, `/beat/0002`, …, `/beat/1500`). Visiting `/beats` redirects to the currently playing beat (`/beat/####`).
- **1-minute loopable beats:** Every beat is 1 minute long and loops seamlessly from end to start.
- **Browser play history (`playedTrackIds`):** The browser saves a list of heard beat IDs in `localStorage`, ordered from oldest to newest. Playing a beat moves its ID to the newest end of the list.
- **How the radio picks the next beat (after Loop 1 finishes):**
  - AI transitions only play during continuous listening, never when the user clicks Skip.
  - After **Loop 1 finishes (`t = 60s`)**, `Track A` starts Loop 2 while the app picks the next beat in three steps:
    1. **Use an unheard saved transition (free):** If `Track A` already has a saved transition to a beat not in `playedTrackIds`, pick one at random.
    2. **Generate a new transition (if under the cap):** If `Track A` has fewer than **8 outgoing transitions** (or 3–6 for Phase 2 tracks), find an unheard `Track B` with the **fewest incoming transitions** (under 8). Generate the `A -> B` transition on the fly and save it to `public.transitions`. `Track A` keeps looping until the transition audio is ready, then blends in at the end of the loop.
    3. **Fallback to the oldest heard transition (free):** If `Track A` is at its cap (or all unheard beats are at their cap), pick the existing transition from `Track A` whose target beat was heard longest ago.
- **Manual skip & anonymous skip counts:**
  - Clicking **Skip / Next** switches to an unheard beat in the browser at `$0` API cost (no ElevenLabs call).
  - Each skip saves `{ track_id, skipped_at_sec, loop_count }` to `public.track_skip_events` with no IP address, cookies, or user ID ([ADR 0008](0008-gdpr-and-wcag-accessibility-compliance.md)).

## Consequences

- We spend `$0` on ignored invites or early skips. Transitions are generated only after a listener finishes a full 1-minute loop and are saved for all future listeners.
- New tracks start with `0` incoming transitions, so step 2 automatically connects them into the radio stream first.
- Queue math and graph selection live in pure `.ts` files under `src/lib/` with unit and mutation tests ([ADR 0003](0003-testing-strategy.md)).

## Alternatives considered

- **Pre-generating beats when sending invite emails:** Wastes API money whenever an invite email goes unopened.
- **Generating transitions between every pair of tracks ($N \times (N - 1)$):** Costs grow quadratically ($O(N^2)$) as the catalog grows.
- **Fixed 10-track batches:** Traps listeners in small repeating loops and adds extra database tables.
- **Saving paid passes only in `localStorage`:** Users lose their pass if they clear browser data or switch devices.
