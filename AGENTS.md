# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo. Keep it short;
details live in [`docs/`](docs/README.md).

## Project

**Beats for Days**: infinite generative 90s boom bap. Next.js (App Router) on
Vercel, Web Audio API for gapless looping, ElevenLabs for generation/inpainting,
plus a separate headless streaming worker for 24/7 YouTube. Architecture:
[`docs/architecture/overview.md`](docs/architecture/overview.md).

## Commands

| Task                            | Command                                    |
| ------------------------------- | ------------------------------------------ |
| Dev server                      | `pnpm dev`                                 |
| Unit/component tests            | `pnpm test` (watch: `pnpm test:watch`)     |
| **Full gate (run before done)** | `pnpm verify`                              |
| CRAP report only                | `pnpm test:crap`                           |
| Mutation testing                | `pnpm test:mutation` (incremental, slower) |
| Architecture boundaries         | `pnpm deps:check`                          |
| Dead code / unused deps         | `pnpm knip`                                |
| Autofix lint + format           | `pnpm lint:fix && pnpm format`             |

Use **pnpm** only. Never edit `pnpm-lock.yaml` by hand.

## Definition of done

1. `pnpm verify` passes (typecheck, lint, format, boundaries, knip, tests, CRAP ≤ 30).
2. TDD practice followed: write a failing test demonstrating the change or bug before writing the implementation logic.
3. New/changed logic has tests that would **fail if the logic broke**. Run
   `pnpm test:mutation` for logic-heavy changes and kill surviving mutants
   (see the `quality-gate` skill).
4. **Strict ADR enforcement:** An ADR draft in `docs/decisions/` is **mandatory**
   for any new library, architectural boundary change, or core pattern change before declaring done.
5. No unapproved `eslint-disable` or `@ts-ignore` comments. When hitting a rule
   boundary, refactor and decompose. Any suppression requires an explicit rationale comment explaining the necessity.
6. **Zero live AI calls:** Never execute requests against live generative APIs
   (Gemini, ElevenLabs) without explicit human confirmation in prompt. Tests and dev loops must run mocked/stubbed.
7. Docs/AGENTS.md updated when commands, structure or conventions change.

## Conventions

- **Logic in `.ts`, presentation in `.tsx`.** Components stay thin; put state
  machines, scheduling math, parsing etc. in `src/lib/**` or hooks so they're
  unit- and mutation-testable. Only `.ts` files are mutation-tested.
- **Layering** (enforced by dependency-cruiser): `app → components → lib`.
  `src/lib` never imports React components/routes. Server-only code
  (`src/lib/env.ts`, `src/lib/elevenlabs/`) must never reach client code;
  mark such modules with `import "server-only"`.
- **Env vars** go through [`src/lib/env.ts`](src/lib/env.ts) (zod) and
  `.env.example`. Never read `process.env` elsewhere. Never commit secrets.
- **Tests** sit next to the code: `foo.ts` → `foo.test.ts` (Node),
  `Foo.tsx` → `Foo.test.tsx` (happy-dom + Testing Library). Assert on
  behaviour and exact outputs, not just "doesn't throw".
- **Complexity budget:** cyclomatic complexity ≤ 10, ≤ 80 lines per function,
  ≤ 300 lines per file, ≤ 4 params. Split instead of disabling rules. If you
  truly must disable one, add a comment explaining why.
- **Async:** no floating promises. Await or explicitly `void` them.
- **AI Token Guardrail:** Generative requests (ElevenLabs audio inpainting, Gemini prompts) must be stubbed/mocked in local development and automated tests. Running live generation or spending API tokens requires explicit user approval and the `ALLOW_LIVE_AI_CALLS=true` runtime flag.
- **Commits:** Conventional Commits (`feat(audio): …`, `fix: …`, `docs: …`).
- Don't bypass hooks (`--no-verify`, `LEFTHOOK=0`) unless the user asks.
- Prefer small, focused changes. Don't add dependencies without a reason;
  knip will flag unused ones.

## Known constraints

- `vitest` is pinned to 4.1.x until Stryker's vitest runner supports Vitest 5
  ([ADR 0003](docs/decisions/0003-testing-strategy.md)).
- `pnpm typecheck` runs `next typegen` first (route types like `LayoutProps`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
