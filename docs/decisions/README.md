# Architecture Decision Records

Short, immutable records of significant decisions: the context, the choice,
and its consequences. Format: lightweight [MADR](https://adr.github.io/madr/).

## Process

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-kebab-title.md`
   (next free number).
2. Fill it in. Keep it short: a page is plenty.
3. Add it to the index below in the same PR as the change it describes.
4. ADRs are **not edited** after acceptance (typos aside). To change a decision,
   write a new ADR and mark the old one `Superseded by NNNN`.

## Index

| #                                                       | Title                                              | Status   |
| ------------------------------------------------------- | -------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)           | Record architecture decisions                      | Accepted |
| [0002](0002-nextjs-pnpm-foundation.md)                  | Next.js App Router + pnpm foundation               | Accepted |
| [0003](0003-testing-strategy.md)                        | Testing strategy: Vitest, CRAP & mutation          | Accepted |
| [0004](0004-code-quality-guardrails.md)                 | Code quality guardrails                            | Accepted |
| [0005](0005-agent-guidelines.md)                        | Agent guidelines & feedback loops                  | Accepted |
| [0006](0006-strict-ai-token-guardrails.md)              | Strict AI token guardrails & cost control          | Accepted |
| [0007](0007-git-branching-pr-workflow.md)               | Git branching, PR workflow & merge standards       | Accepted |
| [0008](0008-gdpr-and-wcag-accessibility-compliance.md)  | Enforce GDPR privacy and WCAG 2.2 AA accessibility | Accepted |
| [0009](0009-beat-generation-access-and-queue-policy.md) | Phased beat generation access & transition graph   | Accepted |
| [0010](0010-history-based-next-track-api.md)            | Deliver next beat via history-based graph API      | Accepted |
| [0011](0011-local-static-audio-asset-delivery.md)       | Local static audio asset delivery                  | Accepted |
| [0012](0012-playwright-e2e-user-flow-testing.md)        | Playwright, Born-Accessible UI & OKLCH tokens      | Accepted |
