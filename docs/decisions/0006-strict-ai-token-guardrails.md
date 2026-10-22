# 0006. Strict AI token guardrails & cost controls

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Generative audio and multimodal API calls (ElevenLabs, Gemini) carry recurring financial costs and consume limited quota tokens. Autonomous AI coding agents working on local tests, benchmarks, or dev servers could inadvertently trigger live API calls, burning tokens during loops or automated test suites.

## Decision

We enforce a **multi-layered defensive policy** across development, testing, and agent workflows:

1. **Offline & Stubbed by Default:** All test suites and standard local dev workflows run against static fixtures, mock stems, or local stubs. No network requests to generative providers are permitted during `pnpm test`, `pnpm verify`, or regular dev builds.
2. **Explicit Opt-In Flag:** Live generative API requests require an explicit runtime opt-in environment flag (`ALLOW_LIVE_AI_CALLS=true`). Without this flag explicitly set in the active execution context, API clients in `src/lib/` must throw an error before initiating outbound network traffic.
3. **Agent Action Guardrail:** AI coding agents are strictly forbidden from executing live generation scripts, cURL commands, or triggering non-mocked API generation without explicit user confirmation in the conversation prompt.
4. **PreToolUse / Hook Enforcement:** Lifecycle hooks warn and block unauthorized shell commands targeting generative endpoints if live flags are detected without user permission.

## Consequences

- Zero accidental token expenditure from running local tests or agent verify loops.
- Live integration verification requires manual human confirmation or running isolated smoke scripts with explicit flags.
- API client implementations must support mock/stub adapter modes out of the box.

## Alternatives considered

- **Relying solely on missing env keys**: Risk of developers populating `.env.local` with real keys, which tests could then unintentionally pick up.
- **Purely manual human supervision**: Error-prone during autonomous agent multi-step loops.
