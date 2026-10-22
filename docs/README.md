# Documentation

The source of truth for _how_ this codebase is structured and _why_ it is the
way it is. Keep docs close to reality: update them in the same PR as the code.

| Section                                     | What lives there                                            |
| ------------------------------------------- | ----------------------------------------------------------- |
| [`architecture/`](architecture/overview.md) | System overview, module layout, layering rules              |
| [`decisions/`](decisions/README.md)         | Architecture Decision Records (ADRs): one file per decision |
| [`guides/testing.md`](guides/testing.md)    | Test conventions, the CRAP gate, mutation testing           |
| [`guides/workflow.md`](guides/workflow.md)  | Local workflow, git hooks, CI, commit conventions           |

Agent-facing instructions live in [`/AGENTS.md`](../AGENTS.md) and
[`/.agents/`](../.agents) (skills + hooks).

## When to write what

- **Made a choice between real alternatives** (library, pattern, data flow,
  trade-off)? → write an ADR in `decisions/`.
- **Changed how modules fit together**? → update `architecture/overview.md`
  (and `.dependency-cruiser.cjs` if a boundary changed).
- **Changed a command, convention or workflow**? → update the relevant guide
  and `AGENTS.md`.
