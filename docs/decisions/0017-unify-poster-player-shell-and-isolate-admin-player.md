# 0017. Unify public routes inside the poster player and isolate admin player

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

The application previously maintained dual layout chrome in `AppChrome`:

- A full-screen Swiss poster player shell (`PosterPlayer`) for `/`, `/beat/*`, `/about`, and `/privacy`.
- A separate editorial frame with a floating bottom player bar (`PersistentPlayerBar`) for 404 pages and `/admin`.
- A vestigial top navigation header (`HeaderNav`) displayed only on `/beats` (which redirects to `/`).

This dual chrome introduced unnecessary layout thrashing, extra DOM nodes, and dead code.
Admin catalog management already contains its own track audition player modal and should not share consumer radio chrome.
404 pages should remain inside the primary Swiss poster layout, matching `/about` and `/privacy`.

## Decision

We will unify all public customer-facing routes inside the `PosterPlayer` shell and isolate `/admin`:

1. **Unify 404 routes inside `PosterInfoSlot`**
   - 404 pages (`src/app/not-found.tsx` and missing `/beat/:id` routes) render inside `PosterPlayer`.
   - The track number area displays `PosterInfoSlot` with `section="not-found"`.
   - The poster canvas visualizers and transport controls remain mounted without flashes.

2. **Isolate local admin dashboard (`/admin`)**
   - Admin routes render directly without `PosterPlayer` or public player chrome.
   - Admin uses its dedicated audition modal (`AdminAuditionModal`) and player hooks.

3. **Delete unused site chrome components**
   - Remove `PersistentPlayerBar` and its tests.
   - Remove `HeaderNav` and its tests.
   - Remove `InfoPage` and its tests.
   - Simplify `AppChrome` to switch between clean admin children and `PosterPlayer`.

## Consequences

- **Easier:** Eliminates canvas remounting and layout shifts when visitors hit unknown beats or 404 pages.
- **Easier:** Removes 6 unused source and test files, cutting bundle size and maintenance overhead.
- **Easier:** Keeps admin tooling cleanly separated from consumer streaming playback.
- **Harder:** 404 editorial content must fit within the Swiss poster text slot rather than a full-width page.

## Alternatives considered

- **Keep `PersistentPlayerBar` only for admin** — rejected because admin already has its own audition player modal.
- **Keep `InfoPage` for 404 pages** — rejected because unmounting the poster visualizer breaks the continuous radio atmosphere.
