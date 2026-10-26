# 0006. Strict AI token guardrails & cost controls

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

ElevenLabs and Gemini API calls cost money and use limited quota. Without safeguards, local dev servers, test suites, or AI coding agents could accidentally call live APIs in a loop and burn budget.

## Decision

We block live AI API calls by default across tests, local dev, and agent runs:

1. **Mocked by default:** All tests (`pnpm test`, `pnpm verify`) and local dev runs use static audio files or mocks. Never call live AI APIs in automated tests.
2. **Opt-in runtime flag:** Live AI calls require `ALLOW_LIVE_AI_CALLS=true` in the environment. If that flag is `false` or missing, API clients in `src/lib/` throw an error before making a network request.
3. **Human approval required:** AI agents must never run live generation scripts or enable `ALLOW_LIVE_AI_CALLS=true` unless the user explicitly asks for it in the prompt.
4. **Hook checks:** Local hooks block shell commands that try to call live AI endpoints without permission.

## Consequences

- Tests and agent loops cannot spend API tokens by accident.
- Testing live APIs requires a human to opt in with `ALLOW_LIVE_AI_CALLS=true`.
- Every AI client in `src/lib/` must support a mock or stub mode.

## Alternatives considered

- **Leaving API keys blank in `.env.local`:** Unsafe once a developer adds a real key for manual testing.
- **Manual review only:** Too slow and easy to miss during multi-step agent runs.
