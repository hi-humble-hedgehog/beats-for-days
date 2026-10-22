## What & why

<!-- One or two sentences. Link the issue / ADR if there is one. -->

## How to verify

<!-- Steps or commands a reviewer can run. -->

## Checklist

- [ ] `pnpm verify` passes locally
- [ ] New logic lives in `.ts` modules with tests (components stay thin)
- [ ] No CRAP offenders, and no new surviving mutants in changed code (see CI artifacts)
- [ ] Architecture decisions recorded in `docs/decisions/` (if any were made)
- [ ] `docs/` / `AGENTS.md` updated if structure, commands or conventions changed
- [ ] New env vars added to `src/lib/env.ts` and `.env.example`
