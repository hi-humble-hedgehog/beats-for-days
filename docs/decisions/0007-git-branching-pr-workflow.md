# 0007. Git branching, PR workflow & merge standards

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

To maintain high code quality and clear change tracking across human developers and AI coding agents, we need disciplined branching conventions, PR size hygiene, and a clean linear commit history on `main`.

## Decision

1. **Branch Naming Standard:**
   - Branches must follow standard prefixes: `feat/*`, `fix/*`, `refactor/*`, `perf/*`, `test/*`, `docs/*`, `chore/*`.
   - Direct work on `main` is disallowed locally (blocked via `lefthook` pre-commit).
2. **Pull Request Protocol:**
   - PR titles must strictly conform to [Conventional Commits](https://www.conventionalcommits.org) (validated in CI).
   - PR size hygiene: PRs targeting >400 modified lines trigger a warning step in CI to encourage bite-sized, reviewable increments.
   - PR description follows `.github/pull_request_template.md` with explicit quality checklist verification.
3. **Merge Strategy:**
   - **Squash and Merge** only.
   - The squashed commit message uses the validated Conventional Commit PR title and description.
   - Automatic deletion of head branches upon merge.
   - Linear history required on `main`.

## Consequences

- Direct accidental commits to local `main` are stopped before committing.
- Repository history on `main` remains clean, bisectable, and conventional.
- Agents must create feature branches before executing multi-step tasks.

## Alternatives considered

- **Rebase and merge**: Preserves individual commits, but agent iterative micro-commits can clutter history.
- **Merge commits**: Creates branching bubbles that complicate automated release notes.
