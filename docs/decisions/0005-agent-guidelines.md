# 0005. Agent guidelines & feedback loops

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Agents produce code quickly but drift from conventions, declare work "done"
without verification, and lose context between sessions. The cheapest fix is
fast, automatic feedback plus a short, accurate set of written instructions.

## Decision

- **`AGENTS.md`** (root) is the single entry point for agent instructions:
  commands, definition of done, conventions. It's read by Antigravity, Codex,
  Cursor, Claude Code (via import) and others. Keep it short and link to
  `docs/` for detail.
- **`.agents/skills/`** hold on-demand procedures:
  - `write-adr`: how to record a decision.
  - `quality-gate`: how to run and fix the CRAP and mutation gates.
- **`.agents/hooks.json` → Stop hook**: when an agent tries to finish a turn
  with uncommitted changes to code, it runs `typecheck` + ESLint on the changed
  files. If they fail, the agent is sent back to fix them (max 3 retries per
  conversation, then it may stop and must explain). Mutation testing is
  deliberately not in the hook (too slow).
- Guardrails are tool-agnostic (git hooks, CI), so non-Antigravity agents and
  humans get the same enforcement.

## Consequences

- Agents get errors back within seconds instead of at PR time.
- The Stop hook adds about 5s to agent turns that touched code.
- Instructions must be maintained. Treat `AGENTS.md` drift as a bug.

## Alternatives considered

- **Long, exhaustive rule files** — burn context budget and get ignored.
- **Running the full `pnpm verify` in the Stop hook** — too slow per turn.
