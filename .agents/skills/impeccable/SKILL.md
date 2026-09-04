---
name: impeccable
description: Review or refine an existing frontend with an editorial design lens when the user asks for UI critique, polish, resilience hardening, UX copy clarification, or task-oriented product-interface guidance. Not for backend-only work, autonomous redesigns, or replacing the project's design system.
metadata:
  version: "4.1.3-nutrimenu.1"
  upstream: "pbakaus/impeccable@c0f495212236129c2e92aaf7714a3a9914569d13"
  license: "Apache-2.0"
---

# Impeccable — Nutrimenu edition

Use Impeccable as a complementary editorial lens. The repository's requirements, established components, product facts, and explicit user brief remain authoritative. Use other audit tooling for deterministic evidence; use this skill for judgment, prioritization, and refinement.

## Route the request

Read only the references needed for the current request:

- UI/UX review without implementation: [references/critique.md](references/critique.md)
- final refinement of an existing implementation: [references/polish.md](references/polish.md)
- loading, errors, permissions, long content, localization, or edge cases: [references/harden.md](references/harden.md)
- labels, forms, errors, confirmations, or UX copy: [references/clarify.md](references/clarify.md)
- dashboards, settings, tables, tools, and authenticated product UI: [references/operate.md](references/operate.md)
- any authorized UI implementation: also read [references/craft-floor.md](references/craft-floor.md) immediately before editing

If two modes materially apply, combine their checks in one bounded pass. Critique remains read-only. Polish, harden, clarify, and operate authorize edits only when the user explicitly requested implementation.

## Nutrimenu authority

- Preserve the incumbent identity and behavior unless the user explicitly asks for a redesign.
- Keep Inter as an accepted product typeface. Do not replace it merely because upstream Impeccable disfavors common fonts.
- Keep existing HSL tokens until a separately approved migration changes the color source of truth.
- Em dashes are valid in PT-BR legal or editorial copy when they improve meaning.
- Prefer the repository's existing Radix primitives, components, Tailwind conventions, and dependencies. Adding or replacing dependencies requires an explicit implementation need.
- Preserve factual, nutritional, legal, pricing, subscription, and permission semantics. Ask before changing meaning or claims.

## Operating boundary

Treat review requests as non-mutating. For authorized edits, make the narrowest patch that resolves confirmed findings and verify it with the repository's existing commands.

Keep the work self-contained: inspect repository files and already available rendered evidence. Invocation alone does not authorize installers, updates, hooks, background servers, external APIs, image generation, subprocess agents, persistent Impeccable state, `PRODUCT.md`, or `DESIGN.md` creation.

Report findings with evidence, user impact, priority, and a concrete remedy. Separate confirmed defects from taste preferences and optional opportunities. Stop after one implementation pass and one verification pass unless the user expands the scope.

## Provenance

This is a project-local, non-executable adaptation of Impeccable skill v4.1.3. See `NOTICE.md` and `LICENSE`.
