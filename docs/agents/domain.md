# Domain Docs

How engineering skills consume this repository's domain documentation.

## Before exploring

Read, when present:

- `CONTEXT.md` at the repository root;
- relevant ADRs under `docs/adr/`.

If these files do not exist, proceed silently. Create them lazily through
domain-modeling only when terminology or a durable decision is actually
resolved.

## Layout

This is a single-context repository:

- `CONTEXT.md` holds the shared domain glossary;
- `docs/adr/` holds durable architectural decisions;
- `src/` contains the application.

## Vocabulary

Use terms defined in `CONTEXT.md` consistently in issue titles, specifications,
tests, code, and review findings. If a required concept is absent, verify
whether it is a real domain gap before introducing a new term.

## ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly
instead of silently overriding the decision.
