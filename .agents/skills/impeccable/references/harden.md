# Harden

Make the authorized interface resilient to real Nutrimenu data, failures, permissions, and device constraints without redesigning it.

## Exercise realistic boundaries

Cover the cases the surface can actually encounter:

- long PT-BR names, ingredient descriptions, recipe titles, dietary labels, monetary values, quantities, and dynamic lists;
- empty, partial, stale, delayed, duplicated, and conflicting data;
- offline, slow, timeout, validation, authentication, permission, rate-limit, and server-error states;
- double submission, concurrent updates, interrupted navigation, and optimistic rollback;
- narrow screens, 200% zoom, keyboard-only use, text scaling, and reduced motion;
- locale-aware dates, numbers, currencies, pluralization, accents, emoji, and safe text wrapping.

Use generated fixtures or reversible local inputs when available. Do not mutate production data to manufacture a state.

## Strengthen the interface

- Preserve user input after recoverable failures.
- Name what failed and the next available action without exposing internal codes as the primary message.
- Distinguish first use, no results, filtered results, permissions, and failures in empty states.
- Prevent duplicate actions while keeping progress and cancellation understandable.
- Use content-flexible layout, `min-width: 0` where flex/grid children need to shrink, logical CSS properties, and accessible overflow behavior.
- Keep client validation helpful while treating server validation and authorization as authoritative.
- Give dynamic changes useful accessible names or announcements.

Route backend security, authorization, data-integrity, or rate-limit defects to the appropriate engineering work. This mode may improve their UI representation but does not silently expand into backend remediation.

## Verify

Retest the affected path with the strongest relevant boundary cases. Confirm that recovery preserves intent, permissions remain truthful, layout stays usable, and errors do not strand the user. Run existing focused tests before broader validation.
