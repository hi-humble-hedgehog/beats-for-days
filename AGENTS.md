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
4. **Scoped ADR enforcement:** An ADR draft in `docs/decisions/` is **mandatory**
   for architectural boundary changes, paid external services, or core subsystem choices before declaring done (routine utility libraries and local helpers do not require an ADR).
5. No unapproved `eslint-disable` or `@ts-ignore` comments. When hitting a rule
   boundary, refactor and decompose. Any suppression requires an explicit rationale comment explaining the necessity.
6. **Zero live AI calls:** Never execute requests against live generative APIs
   (Gemini, ElevenLabs) without explicit human confirmation in prompt. Tests and dev loops must run mocked/stubbed.
7. **GDPR & WCAG 2.2 AA compliance:** Every UI and backend change must satisfy [`docs/guides/compliance-and-a11y.md`](docs/guides/compliance-and-a11y.md) ([ADR 0008](docs/decisions/0008-gdpr-and-wcag-accessibility-compliance.md)) — privacy by design (zero non-essential tracking without prior opt-in, no third-party CDN IP leaks, no PII sent to external APIs) and accessible UI (semantic landmarks, full keyboard navigation, ARIA states/live regions for audio, ≥ 4.5:1 contrast, `prefers-reduced-motion` support).
8. Docs/AGENTS.md updated when commands, structure or conventions change.

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
- **GDPR & Privacy by Design:** Zero non-essential cookies, analytics, or persistent storage without explicit opt-in consent. Self-host all fonts (`next/font`) and static assets so visitor IPs never leak to third-party CDNs. Never forward user IPs or PII to external APIs (ElevenLabs, Gemini, Supabase).
- **Accessibility (a11y / WCAG 2.2 AA):** Use semantic HTML (`<main>`, `<nav>`, `<button>`, `<input type="range">`), visible `:focus-visible` states, and full keyboard operability. Audio controls require accurate ARIA labels/value text and `aria-live="polite"` status announcements. Visualizers must honour `prefers-reduced-motion: reduce` and never flash > 3 times/sec. Test components via `getByRole`. See [`docs/guides/compliance-and-a11y.md`](docs/guides/compliance-and-a11y.md).
- **Commits:** Conventional Commits (`feat(audio): …`, `fix: …`, `docs: …`).
- **Branching:** Never commit directly to `main`. Create task branches (`feat/*`, `fix/*`, `refactor/*`, `chore/*`).
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
