# Operate

> Modified from Impeccable v4.1.3 for Nutrimenu. See [NOTICE.md](../NOTICE.md) and [LICENSE](../LICENSE).

Use this mode for authenticated product surfaces where the user is completing a task: dashboards, settings, tables, editors, forms, and administrative tools. Familiarity, scanability, consistency, and truthful state outrank novelty.

## Product interface standard

- Preserve the established type roles: Plus Jakarta Sans for body/UI, Playfair Display for headings/display, and Great Vibes for script accents.
- Use the target surface's existing tokens: semantic HSL variables in the authenticated app or scoped `--lc-*` variables on landing pages. Preserve their meanings across hover, focus, active, disabled, selected, loading, error, warning, success, and informational states.
- Prefer the repository's existing Radix primitives, Lucide icons, and component vocabulary for accessible behavior.
- Treat responsive behavior structurally: collapse navigation, reflow columns, and adapt tables rather than relying on fluid display typography.
- Keep dense information when the task needs it; density is not a defect by itself.
- Use motion to explain state or feedback, generally within a short interaction interval and with a reduced-motion path.

Every interactive component should cover the states its behavior can reach. Keep the same action, field, overlay, icon, and navigation patterns consistent across screens. Standard affordances require a concrete usability benefit before replacement.

## Check the work scene

Evaluate the actual task sequence, data volume, role, permissions, input method, interruption risk, and consequence of error. A visually calm interface can still fail if users cannot locate state, compare values, recover from errors, or understand what was saved.

For tables and lists, verify scan order, alignment, sorting/filter state, overflow, empty results, pagination or virtualization when needed, and keyboard access. For overlays, verify focus management, escape behavior, stacking, clipping, and return focus.

Finish with task completion evidence, not aesthetic novelty.
