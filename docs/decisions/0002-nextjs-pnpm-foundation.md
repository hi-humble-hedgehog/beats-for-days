# 0002. Next.js App Router + pnpm foundation

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

The product is a web player (Web Audio + visuals) with serverless endpoints
that call ElevenLabs, hosted on Vercel. We need a stack with first-class
Vercel support, server-side secret handling and strong TypeScript support.

## Decision

- **Next.js 16 (App Router, `src/` dir, Turbopack)** scaffolded with
  `create-next-app`, with **TypeScript** and **Tailwind CSS v4**.
- **pnpm** as the only package manager (strict, non-flat `node_modules`
  catches undeclared dependencies). Version pinned via `packageManager`.
- **Node 22** (`.nvmrc`, `engines: >=22.12`).
- `tsconfig` tightened beyond Next defaults: `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- **zod** validates server env vars lazily (`src/lib/env.ts`) so builds don't
  need runtime secrets but requests fail fast and clearly.
- Next.js 16 ships its own agent block in `AGENTS.md`; we keep it verbatim
  (`next dev` re-adds it otherwise).

## Consequences

- `pnpm typecheck` runs `next typegen` first, because Next generates global
  route types (`LayoutProps`, `PageProps`) into `.next/types`.
- pnpm's isolated layout breaks some tools' plugin auto-discovery (e.g.
  Stryker); list plugins explicitly when that happens.
- Node 22 is in maintenance LTS; move to Node 24 (active LTS) soon. Note that
  jsdom ≥ 30 already requires Node ≥ 22.22, which is one reason tests use
  happy-dom.

## Alternatives considered

- **Vite SPA + separate API** — loses Vercel/Next server integration for
  secrets and routing.
- **npm / yarn** — pnpm is faster and stricter.
