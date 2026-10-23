# Testing guide

Why we test this way: [ADR 0003](../decisions/0003-testing-strategy.md).

## Where tests go

| Code                        | Test file                        | Environment                                 |
| --------------------------- | -------------------------------- | ------------------------------------------- |
| `src/lib/audio/loop.ts`     | `src/lib/audio/loop.test.ts`     | Node (`unit` project)                       |
| `src/components/Player.tsx` | `src/components/Player.test.tsx` | happy-dom + Testing Library (`dom` project) |
| `scripts/**.ts`             | next to the file                 | Node                                        |

Shared setup lives in `test/` (`setup-dom.ts`, `stubs/`).

## Writing good tests

- Assert **exact outputs and behaviour** (`toEqual`, `toBe`, exact error
  messages), not "it ran" or "is truthy". Mutation testing will catch weak
  assertions anyway.
- Test boundaries (`<` vs `<=`), empty inputs and error paths.
- Prefer pure functions. Inject time, randomness and `AudioContext` so tests
  are deterministic: pass `now()` / `random()` / a context factory as
  parameters rather than reaching for globals.
- Components: query by accessible role/label (`getByRole`, `getByLabelText`) rather than test IDs or CSS selectors to enforce WCAG semantics ([ADR 0008](../decisions/0008-gdpr-and-wcag-accessibility-compliance.md)). Verify keyboard operability, ARIA states (`aria-pressed`, `aria-valuetext`, `aria-live`), and `prefers-reduced-motion` behaviour where applicable. Use `@testing-library/user-event` for interactions (add it as a devDependency when first needed).
- Avoid `vi.resetModules()` + dynamic `import()` unless module-level state
  forces it (it confuses Stryker's per-test coverage).

## The CRAP gate

```bash
pnpm test:crap            # coverage + report, fails if any function > 30
pnpm crap --top 20        # re-print report from existing coverage
```

`CRAP = complexity² × (1 − coverage)³ + complexity`

| Complexity | 0% covered | 50% covered | 100% covered |
| ---------- | ---------- | ----------- | ------------ |
| 1          | 2          | 1.1         | 1            |
| 5          | 30         | 8.1         | 5            |
| 8          | 72         | 16          | 8            |
| 10         | 110        | 22.5        | 10           |

So: simple glue may stay untested, but anything with real branching needs
tests. To fix an offender, **add tests** (cheapest) or **split the function**
(lowers complexity). Full report: `reports/crap.json`.

How it works: `scripts/crap/complexity.ts` computes McCabe complexity per
function from the TypeScript AST (if / ?: / loops / case / catch / && / || /
?? and their assignment forms; nested functions scored separately).
`scripts/crap/coverage.ts` attributes each Istanbul statement to its innermost
function. Both are tested and mutation-tested.

## Mutation testing

```bash
pnpm test:mutation        # incremental: only re-tests changed code/tests
pnpm test:mutation --force  # ignore the incremental cache, full run
open reports/mutation/index.html
```

Stryker changes your code in small ways (flips `<` to `<=`, empties strings,
removes calls…) and re-runs the tests. A **surviving mutant** means no test
noticed the change, which means that behaviour is unprotected.

For each survivor:

1. **Missing assertion?** Add or tighten a test (most common).
2. **Redundant code?** If the mutant can't change behaviour, simplify the
   code so the mutant can't exist (e.g. drop a defensive check the types
   already guarantee).
3. **Truly equivalent** (rare): suppress with a reason:
   `// Stryker disable next-line EqualityOperator: <why it's equivalent>`

Scope: `.ts` files in `src/` and `scripts/` (excluding tests and `cli.ts`).
Break threshold: **75%**, target **≥ 90%**.
