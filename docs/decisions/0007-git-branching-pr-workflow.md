# 0007. Git branching, PR workflow & merge standards

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Both humans and AI agents contribute to this repo. We need simple branching rules, small pull requests, and a clean commit history on `main`.

## Decision

1. **Branches:**
   - Start every task on a branch named `feat/*`, `fix/*`, `refactor/*`, `perf/*`, `test/*`, `docs/*`, or `chore/*`.
   - `lefthook` blocks direct commits to local `main`.
2. **Pull requests:**
   - Write PR titles in [Conventional Commits](https://www.conventionalcommits.org) format (checked in CI).
   - Keep PRs under **400 changed production lines** (excluding `*.test.*`, `docs/`, and `pnpm-lock.yaml`). CI warns if a PR is larger.
   - Fill out the checklist in `.github/pull_request_template.md`.
3. **Merging:**
   - Use **Squash and Merge** so `main` stays linear.
   - Delete the feature branch after merging.

## Consequences

- Local hooks stop accidental commits to `main`.
- `main` has one clean commit per PR, making `git bisect` and release notes easy.
- Agents must create a branch before committing changes.

## Alternatives considered

- **Rebase and merge:** Keeps noisy work-in-progress commits on `main`.
- **Merge commits:** Adds merge commits that clutter `git log`.
