---
name: write-adr
description: >-
  Records an Architecture Decision Record in docs/decisions/. Use when an
  architectural boundary changes, a paid external service is added, or a core
  subsystem choice is made (routine utility libraries and local helpers do not
  need an ADR), or when the user asks to document a decision.
---

# Write an ADR

1. Find the next number: list `docs/decisions/` and take the highest `NNNN` + 1.
2. Copy `docs/decisions/0000-template.md` to
   `docs/decisions/NNNN-kebab-case-title.md`. Title in imperative mood
   ("Use X for Y").
3. Fill in Context → Decision → Consequences → Alternatives. Keep it under a
   page and follow **ISO 24495-1 plain language**: short sentences (≤ 20 words),
   active voice ("We will …"), everyday words instead of jargon, and bullet
   lists or tables for scannability. Include concrete consequences (follow-ups,
   constraints, things that get harder).
4. Set `Status: Accepted` (or `Proposed` if the user hasn't agreed yet) and
   today's date.
5. If it replaces an earlier ADR, change only the old ADR's status line to
   `Superseded by [NNNN](NNNN-title.md)`. Don't rewrite its body.
6. Add a row to the index table in `docs/decisions/README.md`.
7. If the decision changes structure, commands or conventions, also update
   `docs/architecture/overview.md`, the relevant guide, and `AGENTS.md`.
   If it changes a module boundary, update `.dependency-cruiser.cjs`.

Verify: `pnpm format:check` passes and the new ADR is linked from the index.
