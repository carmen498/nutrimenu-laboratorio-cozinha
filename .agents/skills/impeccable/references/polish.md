# Polish

> Modified from Impeccable v4.1.3 for Nutrimenu. See [NOTICE.md](../NOTICE.md) and [LICENSE](../LICENSE).

Polish is refinement of an existing implementation. Preserve its visual world, content, behavior, and everything outside the authorized scope. If the concept itself is wrong, report that separately instead of concealing a redesign inside cleanup.

## Establish the system

Read the target, representative shared components, tokens, and neighboring flows. Classify each issue as:

- missing reusable token;
- one-off implementation where an existing shared pattern applies;
- conceptual mismatch with neighboring product areas;
- local defect or incomplete state.

Fix the cause at the narrowest correct level.

## Triage the path

Work in this order:

1. blocked tasks, misleading state, data loss, accessibility, and permission failures;
2. missing loading, empty, error, success, disabled, and recovery states;
3. flow, hierarchy, responsive behavior, and design-system drift;
4. typography, spacing, color, imagery, icon, and motion inconsistencies;
5. accidental duplication, dead code, and temporary artifacts created by the change.

Do not perfect one component while leaving the surrounding journey below the same quality bar.

## Refine

- Make the primary task and current state immediately clear.
- Align spacing and type with the existing system, including optical alignment and realistic wrapping.
- Use semantic colors and stable meanings across states and themes.
- Keep icon family, weight, size, and alignment consistent.
- Provide visible focus, logical keyboard order, useful labels, and appropriate touch targets.
- Keep motion purposeful, interruptible, performant, and compatible with reduced-motion preferences.
- Preserve factual copy and ask before changing claims or domain terminology.

## Verify

Exercise the complete affected path at representative narrow and wide layouts. Cover realistic content plus loading, empty, error, success, disabled, long-content, and permission-limited states that the product can reach. Check zoom, contrast, focus, semantics, console errors, layout shift, and interaction latency where observable.

Finish with the source diff and the repository's existing validation commands. Remove accidental churn and report any unverified behavior. One repair pass and one confirmation pass are the default bound.
