# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Much of this codebase will be written with AI agents. Agents (and future
humans) lack the conversational context in which choices were made, and will
happily "fix" a deliberate trade-off they don't understand.

## Decision

We record significant decisions as ADRs in `docs/decisions/`, using the
template in `0000-template.md`. `AGENTS.md` instructs agents to read relevant
ADRs before changing an area and to write a new ADR when they make a
significant decision. A `write-adr` skill in `.agents/skills/` documents the
procedure.

## Consequences

- Rationale survives beyond chat history and PR descriptions.
- Small overhead per decision; mitigated by keeping ADRs short.
- Superseding (not editing) keeps an honest history.

## Alternatives considered

- **Wiki / Notion** — drifts from code and is invisible to agents.
- **PR descriptions only** — hard to discover later.
