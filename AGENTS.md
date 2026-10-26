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
| End-to-end browser tests        | `pnpm test:e2e` (UI: `pnpm test:e2e:ui`)   |
| Static a11y & contrast lint     | `pnpm lint:a11y`                           |
| Runtime a11y audit report       | `pnpm audit:a11y`                          |
| **Full gate (run before done)** | `pnpm verify`                              |
| CRAP report only                | `pnpm test:crap`                           |
| Mutation testing                | `pnpm test:mutation` (incremental, slower) |
| Architecture boundaries         | `pnpm deps:check`                          |
| Dead code / unused deps         | `pnpm knip`                                |
| Convert WAV starter assets      | `pnpm audio:convert`                       |
| Seed database & storage         | `pnpm db:seed`                             |
| Autofix lint + format           | `pnpm lint:fix && pnpm format`             |

Use **pnpm** only. Never edit `pnpm-lock.yaml` by hand.

## Definition of done

1. `pnpm verify` passes (typecheck, lint, a11y lint, format, boundaries, knip, tests, CRAP ≤ 30, E2E + axe-core).
2. Write a failing test first (TDD) before writing the fix or feature.
3. New or changed logic has tests that **fail if the logic breaks**. Run `pnpm test:mutation` for logic-heavy changes and kill surviving mutants (see the `quality-gate` skill).
4. **Write an ADR when needed:** Add an ADR in `docs/decisions/` for architecture boundary changes, paid external services, or core subsystem choices. Skip ADRs for routine helpers or small utilities.
5. No unapproved `eslint-disable` or `@ts-ignore` comments. Split the function instead. If you must suppress a rule, add a comment explaining why.
6. **Zero live AI calls:** Never call live generative APIs (Gemini, ElevenLabs) without explicit human approval in the prompt. Tests and local dev must use mocks or stubs.
7. **GDPR & WCAG 2.2 AA compliance:** Follow [`docs/guides/compliance-and-a11y.md`](docs/guides/compliance-and-a11y.md) ([ADR 0008](docs/decisions/0008-gdpr-and-wcag-accessibility-compliance.md)) and `.agents/skills/born-accessible-ui/SKILL.md`:
   - **Privacy:** No non-essential cookies or trackers without prior opt-in. Self-host fonts and assets so visitor IPs never leak to third-party CDNs. Never send user IPs or personal data to external APIs.
   - **Accessibility:** Use semantic HTML, full keyboard navigation, ARIA states and `aria-live="polite"` for audio, ≥ 4.5:1 contrast with computed `/* Contrast: X.X:1 vs --bg (level) */` comments, 320px reflow, and `prefers-reduced-motion` support.
8. **Keep docs and comments in sync (ISO 24495-1 plain language):** Update JSDoc comments, [`docs/`](docs/README.md), and `AGENTS.md` in the same change whenever behaviour, parameters, commands, or conventions change. Write all docs, comments, ADRs, and plans in plain language (ISO 24495-1).

## Conventions

- **Plain language (ISO 24495-1) in all docs, comments, and plans:**
  - **Relevant:** Lead with the main point or _why_. Leave out filler.
  - **Findable:** Use clear headings, bullet lists, and tables instead of walls of text.
  - **Understandable:** Use short sentences (aim for ≤ 20 words, one idea per sentence), active voice, and everyday words instead of jargon.
  - **Usable:** State clear, concrete actions so the reader knows what to do.
- **Logic in `.ts`, presentation in `.tsx`.** Keep React components thin. Put state machines, timing math, and parsing in `src/lib/**` or hooks so they can be unit- and mutation-tested. Only `.ts` files run through mutation testing.
- **Layering** (enforced by dependency-cruiser): `app → components → lib`. `src/lib` never imports React components or routes. Server-only code (`src/lib/env.ts`, `src/lib/elevenlabs/`) must never reach the browser; mark those files with `import "server-only"`.
- **Env vars** go through [`src/lib/env.ts`](src/lib/env.ts) (zod) and `.env.example`. Never read `process.env` anywhere else. Never commit secrets.
- **Tests** sit next to the code: `foo.ts` → `foo.test.ts` (Node), `Foo.tsx` → `Foo.test.tsx` (happy-dom + Testing Library), and full browser user flows in `e2e/*.spec.ts` (Playwright). Assert on exact outputs and behaviour, not just "doesn't throw".
- **Complexity budget:** cyclomatic complexity ≤ 10, ≤ 80 lines per function, ≤ 300 lines per file, ≤ 4 params. Split functions instead of disabling rules.
- **JSDoc for rationale (`src/lib/**`):** Exported functions, classes, and methods in `src/lib/**` require a JSDoc comment (`eslint-plugin-jsdoc`). Explain **why** the function exists or key rules in 1–3 short sentences (ISO 24495-1). Do not restate the function name or duplicate TypeScript types (`jsdoc/no-types`). Update the JSDoc whenever the function changes.
- **Keep related code together:** Keep tightly coupled hooks, sub-components, and local helpers in the same file instead of creating single-use, 10-line files. Split into a new file only when code is shared across multiple callers or approaches the 300-line limit.
- **Async:** no floating promises. `await` or `void` every promise.
- **AI Token Guardrail:** Stub or mock all generative API calls (ElevenLabs, Gemini) in local dev and tests. Live generation requires explicit user approval and `ALLOW_LIVE_AI_CALLS=true`.
- **GDPR & Privacy:** No non-essential cookies, analytics, or persistent storage without opt-in consent. Self-host fonts (`next/font`) and static assets. Never send visitor IPs or personal data to external APIs.
- **UI & Design Tokens (`OKLCH`):** Define palette and semantic color tokens in perceptual `oklch(L C H)` in [`src/app/globals.css`](src/app/globals.css) and [`src/lib/design-tokens.ts`](src/lib/design-tokens.ts) instead of hardcoded hex values.
- **Accessibility (WCAG 2.2 AA):** Annotate foreground/background tokens in [`src/app/globals.css`](src/app/globals.css) with computed `/* Contrast: X.X:1 vs --bg (level) */` assertions verified by `pnpm lint:a11y`. Use semantic HTML (`<main>`, `<nav>`, `<button>`, `<input type="range">`), visible `:focus-visible` states, and keyboard navigation. Give audio controls clear ARIA labels and `aria-live="polite"` announcements. Honour `prefers-reduced-motion: reduce` and never flash > 3 times/sec. Query components with `getByRole` in tests.
- **Commits:** Conventional Commits (`feat(audio): …`, `fix: …`, `docs: …`).
- **Branching:** Never commit directly to `main`. Use task branches (`feat/*`, `fix/*`, `refactor/*`, `chore/*`).
- Don't bypass git hooks (`--no-verify`, `LEFTHOOK=0`) unless the user asks.
- Prefer small, focused changes. Don't add dependencies without a clear need; knip will flag unused ones.

## Known constraints

- `vitest` is pinned to 4.1.x until Stryker's vitest runner supports Vitest 5
  ([ADR 0003](docs/decisions/0003-testing-strategy.md)).
- `pnpm typecheck` runs `next typegen` first (route types like `LayoutProps`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
