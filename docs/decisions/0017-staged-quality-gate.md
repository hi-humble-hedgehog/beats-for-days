# 0017. Stage the quality gate by cost: task, commit, push, PR

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

The full gate ran three times per change: when an agent finished a task, on
`git push`, and again in CI. It includes E2E tests, which need Docker, local
Supabase and a build. The definition of done also asked for mutation testing
per task. This slowed down work between tasks without catching more bugs,
because CI runs the same checks on every PR.

Pre-commit also ran a full-project `next typegen && tsc` on every commit.

## Decision

We will run each check at the cheapest stage where it still gives useful
feedback.

| Stage           | Command / hook           | Checks                                                                 |
| --------------- | ------------------------ | ---------------------------------------------------------------------- |
| Agent turn ends | Stop hook (ADR 0005)     | typecheck, ESLint on changed files                                     |
| Task done       | `pnpm check`             | typecheck, ESLint (cached), a11y lint, Vitest on changed files         |
| `git commit`    | pre-commit               | gitleaks, eslint --fix and prettier on staged files, commitlint        |
| `git push`      | pre-push → `pnpm verify` | typecheck, lint, a11y lint, format, boundaries, knip, all tests + CRAP |
| Pull request    | CI                       | `verify` + build, E2E + axe-core, mutation testing, gitleaks           |
| Before merge    | PR review                | kill surviving mutants in changed files, ADR if needed, docs in sync   |

- `pnpm verify:full` runs the same checks as CI locally (verify, E2E, mutation).
- Run `pnpm test:e2e` or `pnpm test:mutation` on demand when a change needs it.
- This amends the "Where it runs" column of [ADR 0004](0004-code-quality-guardrails.md)
  for types (moved out of pre-commit) and E2E (moved out of pre-push). It also
  amends point 6 of [ADR 0012](0012-playwright-e2e-user-flow-testing.md):
  E2E is no longer part of `pnpm verify`.

## Consequences

- Between tasks, `pnpm check` takes seconds instead of minutes.
- Pushing no longer needs Docker or Supabase running.
- E2E, axe-core and mutation failures show up later, on the PR. Humans and
  agents **open a draft PR right after the first push** so CI runs on the
  branch (steps in `AGENTS.md` and `docs/guides/workflow.md`).
- CI only runs on pull requests and on `main`. A branch pushed without a PR
  gets no E2E or mutation feedback.
- Type errors can now reach a local commit. The Stop hook, `pnpm check` and
  pre-push still catch them before they leave the machine.

## Alternatives considered

- **Keep E2E in pre-push** — catches browser bugs earlier, but every push
  needs Docker and Supabase and takes minutes.
- **Run CI on every branch push** — earlier feedback without a PR, but runs
  twice when a PR is open and costs more CI minutes.
- **Drop mutation testing** — loses our main signal for weak tests (ADR 0003).
