# Documentation

The source of truth for _how_ this codebase is structured and _why_ it is the
way it is. Keep docs close to reality: update them in the same PR as the code.

| Section                                                                  | What lives there                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [`architecture/`](architecture/overview.md)                              | System overview, module layout, layering rules              |
| [`architecture/audio-engine.md`](architecture/audio-engine.md)           | Web Audio engine, loop timing, and transition splices       |
| [`architecture/generation-policy.md`](architecture/generation-policy.md) | Phased generation access, waitlist & transition graph       |
| [`decisions/`](decisions/README.md)                                      | Architecture Decision Records (ADRs): one file per decision |
| [`guides/testing.md`](guides/testing.md)                                 | Test conventions, the CRAP gate, mutation testing           |
| [`guides/workflow.md`](guides/workflow.md)                               | Local workflow, git hooks, CI, commit conventions           |
| [`guides/compliance-and-a11y.md`](guides/compliance-and-a11y.md)         | GDPR privacy-by-design & WCAG 2.2 AA accessibility rules    |

Agent-facing instructions live in [`/AGENTS.md`](../AGENTS.md) and
[`/.agents/`](../.agents) (skills + hooks).

## Writing style (ISO 24495-1 Plain Language)

All docs, ADRs, JSDoc comments, and implementation plans follow **ISO 24495-1**:

1. **Relevant:** Lead with the main point or _why_. Cut background filler.
2. **Findable:** Use clear headings, bullet lists, and tables so readers can scan quickly.
3. **Understandable:** Keep sentences short (aim for ≤ 20 words, one idea per sentence). Use active voice ("The server hashes the key", not "The key is hashed") and everyday words instead of jargon.
4. **Usable:** State clear, concrete actions so the reader knows what to do.

## When to update what

- **Changed an architecture boundary, added a paid external service, or chose a core subsystem?** → Write an ADR in `decisions/`. (Skip ADRs for routine helpers or small utilities.)
- **Changed how modules fit together?** → Update `architecture/overview.md` (and `.dependency-cruiser.cjs` if a boundary changed).
- **Changed a function's behaviour, parameters, or rationale?** → Update its JSDoc comment and any related guide in the same PR.
- **Changed a command, convention, or workflow?** → Update the relevant guide and `AGENTS.md`.
