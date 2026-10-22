# 0003. Testing strategy: Vitest, CRAP gate & mutation testing

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Line-coverage targets are easy to game (especially by agents): tests that
execute code without asserting anything still count. We want signals that
measure whether tests _protect_ behaviour, without blocking simple glue code.

## Decision

1. **Vitest** with two projects:
   - `unit`: `*.test.ts`, Node environment (fast, for logic).
   - `dom`: `*.test.tsx`, **happy-dom** + Testing Library (components).
2. **No global coverage-percentage threshold.** Instead:
3. **CRAP gate** (`pnpm test:crap`): every function's
   `CRAP = complexity² × (1 − coverage)³ + complexity` must be **≤ 30**.
   Implemented in-repo (`scripts/crap/`) from the TypeScript AST (cyclomatic
   complexity) and Istanbul `coverage-final.json` (per-function statement
   coverage). Simple untested glue passes; complex untested logic fails.
   Note that a function with complexity > 30 can never pass, even when
   fully covered, so ESLint caps complexity at 10.
4. **Mutation testing** with **StrykerJS** (`pnpm test:mutation`), TypeScript
   checker enabled, **incremental** mode. Scope: `.ts` files in `src/` and
   `scripts/` (not `.tsx` presentation, not `cli.ts` glue).
   Thresholds: high 90 / low 80 / **break 75**.
5. **Logic in `.ts`, presentation in `.tsx`**, so the code that matters is
   cheap to unit- and mutation-test.
6. Mutation testing runs in **CI** (every PR, cached incremental baseline)
   and on demand locally, **not** in git hooks (too slow for the inner loop).

## Consequences

- **Vitest is pinned to 4.1.x.** `@stryker-mutator/vitest-runner@10.0.0`
  doesn't activate runtime mutants under Vitest 5: every mutant "survives"
  and scores collapse to about 0%. Dependabot ignores Vitest ≥ 5. Re-test
  when Stryker ships Vitest 5 support, then supersede this point.
- Stryker uses localhost IPC between processes; sandboxed environments must
  allow local sockets.
- Stryker plugins are listed explicitly (pnpm defeats auto-discovery).
- Tests that use `vi.resetModules()` + dynamic `import()` make module-level
  code look test-specific to Stryker, which can hide surviving mutants. Prefer
  static imports and only re-import where module state forces it.
- Equivalent mutants occasionally survive; prefer rewriting code so the
  mutant can't exist. Otherwise use `// Stryker disable next-line <mutator>: <reason>`.

## Alternatives considered

- **Global 80% line coverage** — gameable; punishes trivial code equally.
- **Off-the-shelf CRAP tools** — none maintained for TS/Vitest; the in-repo
  tool is ~150 lines and itself mutation-tested.
- **jsdom** — v30 requires Node ≥ 22.22 and is heavier; happy-dom suffices
  (neither implements Web Audio, which we mock anyway).
