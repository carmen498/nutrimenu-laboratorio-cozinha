# Critique

> Modified from Impeccable v4.1.3 for Nutrimenu. See [NOTICE.md](../NOTICE.md) and [LICENSE](../LICENSE).

Produce an evidence-based design review without changing files.

## Resolve the target

Identify the exact route, screen, component, or flow under review. Inspect its source, nearby shared components, current tokens, and any rendered evidence already available. If the target is materially ambiguous, ask one focused question.

## Review independently

Form the visual and interaction judgment in the current thread before consulting automated findings so detector output does not anchor the assessment.

Evaluate:

- product specificity: whether the interface reflects this product rather than a generic template;
- hierarchy and comprehension: primary task, current state, sequence, and decision load;
- interaction: discoverability, feedback, error recovery, permissions, and destructive actions;
- accessibility: semantics, keyboard path, focus, contrast, zoom, touch targets, and announced state changes;
- resilience: responsive layouts, realistic copy, long content, loading, empty, error, and disabled states;
- consistency: terminology, components, tokens, spacing, iconography, and behavior across neighboring flows;
- emotional fit: reassurance around payments, deletion, access, legal meaning, and other high-stakes moments.

When an existing local audit skill is available, use it only to corroborate mechanical findings. A clean checklist is not proof of a coherent experience.

## Prioritize

Use the smallest severity set that communicates the decision:

- **P0:** blocks a critical task or creates immediate safety, privacy, data-loss, or accessibility risk;
- **P1:** materially misleads, excludes, or prevents a core journey;
- **P2:** important friction, inconsistency, or resilience gap;
- **P3:** optional refinement with limited user impact.

For every finding, name the evidence, user impact, affected surface, and narrow remedy. Mark taste-based opportunities as optional rather than defects.

## Deliver

Lead with the verdict. Then provide strengths, priority findings, and the recommended sequence. State what could not be verified. Do not persist snapshots, start servers, edit code, or turn the critique into an implementation unless the user asks.
