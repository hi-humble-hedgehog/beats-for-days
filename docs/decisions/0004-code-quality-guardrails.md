# 0004. Code quality guardrails

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

We want a clean codebase without slowing down iteration. Checks should be
automatic, fast where they run often, and thorough where they run rarely.

## Decision

| Guardrail               | Tool                                                              | Where it runs                 |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------- |
| Formatting              | Prettier (+ Tailwind plugin)                                      | pre-commit (staged), CI       |
| Linting                 | ESLint 9 flat config: Next + type-aware rules + complexity budget | pre-commit (staged), CI       |
| Types                   | `tsc` strict+                                                     | pre-commit, CI                |
| Secrets                 | gitleaks                                                          | pre-commit (if installed), CI |
| Commit messages         | commitlint (Conventional)                                         | commit-msg                    |
| Tests                   | Vitest                                                            | pre-push, CI                  |
| Architecture boundaries | dependency-cruiser                                                | pre-push, CI                  |
| Dead code / unused deps | knip                                                              | pre-push, CI                  |
| CRAP gate               | `scripts/crap`                                                    | pre-push, CI                  |
| Mutation testing        | Stryker (incremental)                                             | CI, on demand                 |
| Build                   | `next build`                                                      | CI                            |
| Dependency updates      | Dependabot (grouped, weekly)                                      | GitHub                        |

Hooks are managed by **lefthook** (fast, parallel, single binary), installed by
`pnpm install` via the `prepare` script.

ESLint complexity budget: cyclomatic ≤ 10, max-depth 4, max-params 4,
≤ 80 lines/function, ≤ 300 lines/file (tests exempt from size limits).
Type-aware rules: no floating or misused promises, exhaustive switches,
consistent type imports, no `any`.

## Consequences

- Commit hook stays at a few seconds; push hook adds about 2s of tests.
- Rules can feel strict early on; splitting functions is the intended fix,
  not `eslint-disable`.
- ESLint 9 is deprecated upstream. Upgrade to 10 once `eslint-config-next`
  supports it.
- Local secret scanning needs `brew install gitleaks`; CI always scans.

## Alternatives considered

- **Biome** instead of ESLint + Prettier — faster, but no type-aware rules or
  Next.js plugin parity yet.
- **husky + lint-staged** — works, but lefthook is one dependency and faster.
