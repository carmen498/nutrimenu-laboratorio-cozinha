# Issue tracker: GitHub

Issues and specs for this repository live in GitHub Issues at
`carmen498/nutrimenu-laboratorio-cozinha`.

Prefer the authenticated GitHub integration when available. In an authenticated
local checkout, the equivalent `gh` CLI commands may be used.

## Conventions

- Create one issue per spec or ticket.
- Read the complete issue body, comments, labels, author, and current state.
- Use comments for durable findings and decisions.
- Apply or remove labels without replacing unrelated labels.
- Close an issue only when the requested outcome explicitly requires closure.
- Read-only review or diagnosis does not authorize issue, label, assignment, or
  state changes.

## Pull requests as a triage surface

**PRs as a request surface: no.**

External pull requests are not included automatically in the triage queue.
An explicitly named pull request may still be reviewed or triaged.

## Skill operations

- “Publish to the issue tracker” means create a GitHub issue in this repository.
- “Fetch the relevant ticket” means read the full GitHub issue and its comments.
- Resolve a bare `#42` by checking whether it is a pull request or an issue.

## Wayfinding operations

- **Map:** one issue labelled `wayfinder:map`.
- **Child ticket:** a child issue linked through GitHub sub-issues. If unavailable,
  use a task list in the map and add `Part of #<map>` to the child.
- **Ticket labels:** `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`.
- **Blocking:** use native GitHub issue dependencies when available; otherwise,
  record `Blocked by: #<n>` in the issue body.
- **Frontier:** open, unblocked, unassigned child issues, in map order.
- **Claim:** assign the issue before starting work.
- **Resolve:** post the resolution, close the child issue, and append a short
  linked context pointer to the map.
