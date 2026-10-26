---
name: quality-gate
description: >-
  Runs and fixes this repo's quality gate: pnpm verify, the CRAP gate and
  Stryker mutation testing. Use before declaring work done, when CI fails,
  when a CRAP offender or surviving mutant is reported, or when the user asks
  about code quality, test strength or coverage.
---

# Quality gate

Background: `docs/guides/testing.md`, `docs/decisions/0003-testing-strategy.md`.

## 1. Fast gate

```bash
pnpm verify
```

Runs typecheck → lint → lint:a11y → format:check → deps:check → knip → tests + CRAP → test:e2e (Playwright + axe-core + 320px reflow).
Fix failures in that order (type errors often cause lint noise).

- **Lint/format**: `pnpm lint:fix && pnpm format`, then fix what remains by hand.
  Complexity/size errors mean split the function, not disable the rule.
- **lint:a11y**: `pnpm lint:a11y` verifies `/* Contrast: X.X:1 vs --bg (level) */` assertions on `oklch(...)` and hex tokens and checks for clickable non-semantic elements or removed focus outlines.
- **deps:check**: read the violated rule's `comment` in
  `.dependency-cruiser.cjs`. Move code to the right layer; don't loosen the rule
  unless the architecture really changed (then write an ADR).
- **knip**: delete unused exports/files/deps. If something is used in a way
  knip can't see (alias, config string), add it to `knip.json` with care.
- **test:e2e**: runs Playwright user flows, `@axe-core/playwright` WCAG 2.2 AA checks, and 320px viewport reflow checks across all routes.

## 2. CRAP offenders

`pnpm crap` prints functions with CRAP > 30 as
`score cc=<complexity> cov=<coverage%> file:line name`.

- Low coverage → write tests for the uncovered branches.
- High complexity (cc ≥ 6 is where untested code starts failing) → extract
  helpers or use lookup tables / early returns, then test the pieces.

## 3. Mutation testing (logic changes)

Needs local sockets. If it fails with `EPERM` in a sandbox, rerun outside it.

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

`pnpm verify` is green, no CRAP offenders, and no surviving mutants in changed
`.ts` files.
