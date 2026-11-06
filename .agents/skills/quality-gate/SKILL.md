---
name: quality-gate
description: >-
  Runs and fixes this repo's quality gate: pnpm check, pnpm verify, the CRAP
  gate and Stryker mutation testing. Use before declaring work done, when CI
  fails, when a CRAP offender or surviving mutant is reported, or when the
  user asks about code quality, test strength or coverage.
---

# Quality gate

Background: `docs/guides/testing.md`, `docs/decisions/0003-testing-strategy.md`,
`docs/decisions/0017-staged-quality-gate.md`.

Checks are staged by cost. Run only the stage you are at:

| Stage        | Command            | Who runs it                    |
| ------------ | ------------------ | ------------------------------ |
| Task done    | `pnpm check`       | you, before saying "done"      |
| `git push`   | `pnpm verify`      | pre-push hook (automatic)      |
| Pull request | CI                 | GitHub Actions (automatic)     |
| Same as CI   | `pnpm verify:full` | you, only when asked or needed |

Don't run `pnpm verify`, E2E or mutation testing between tasks.

**Get CI feedback early:** after the first commit on a branch, push and open a
draft PR (`gh pr create --draft --fill`). Check results with `gh pr checks`
and read failures with `gh run view --log-failed`. See `AGENTS.md`.

## 1. Task check

```bash
pnpm check
```

Runs typecheck → lint (cached) → lint:a11y → Vitest on changed files.

- **Lint/format**: `pnpm lint:fix && pnpm format`, then fix what remains by hand.
  Complexity/size errors mean split the function, not disable the rule.
- **lint:a11y**: verifies `/* Contrast: X.X:1 vs --bg (level) */` assertions on `oklch(...)` and hex tokens and checks for clickable non-semantic elements or removed focus outlines.

## 2. Push gate (when the pre-push hook or CI fails)

```bash
pnpm verify
```

Adds format:check → deps:check → knip → all tests + CRAP.
Fix failures in that order (type errors often cause lint noise).

- **deps:check**: read the violated rule's `comment` in
  `.dependency-cruiser.cjs`. Move code to the right layer; don't loosen the rule
  unless the architecture really changed (then write an ADR).
- **knip**: delete unused exports/files/deps. If something is used in a way
  knip can't see (alias, config string), add it to `knip.json` with care.
- **CRAP offenders**: `pnpm crap` prints functions with CRAP > 30 as
  `score cc=<complexity> cov=<coverage%> file:line name`.
  - Low coverage → write tests for the uncovered branches.
  - High complexity (cc ≥ 6 is where untested code starts failing) → extract
    helpers or use lookup tables / early returns, then test the pieces.

## 3. E2E (CI, or on demand)

`pnpm test:e2e` runs Playwright user flows, `@axe-core/playwright` WCAG 2.2 AA
checks and 320px reflow checks. It needs Docker and `supabase start`. Run it
locally when you change UI, routes or API flows, or when CI's E2E job fails.

## 4. Mutation testing (CI, or on demand)

CI runs Stryker on every PR and uploads a `mutation-report` artifact. Fix
survivors in changed `.ts` files before merge. To run it locally (needs local
sockets; if it fails with `EPERM` in a sandbox, rerun outside it):

```bash
pnpm test:mutation
```

Read the `[Survived]` blocks (file:line, original `-`, mutant `+`). For each:

1. Write or tighten a test that fails on the mutant. Exact `toEqual`/`toBe`
   assertions, boundary values, and exact error messages kill most survivors.
2. If no observable behaviour could ever differ, simplify the code so the
   mutant disappears.
3. Only for truly equivalent mutants:
   `// Stryker disable next-line <Mutator>: <reason>`.

Re-run `pnpm test:mutation` (incremental, so it's quick) until no new survivors
remain in the code you touched. Score must stay ≥ 75% (target ≥ 90%).

## Done when

- **Task:** `pnpm check` is green.
- **Merge:** CI is green (verify, build, E2E, mutation), no CRAP offenders, and
  no surviving mutants in changed `.ts` files.
