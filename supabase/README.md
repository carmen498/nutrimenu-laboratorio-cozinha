# Supabase database bootstrap

This directory is the reproducible, local-only database foundation and target
operational model for the Base44 to Supabase migration.

## Scope

The database project contains:

- the Supabase CLI configuration;
- a private landing and reconciliation schema;
- the typed operational schema in `public`;
- explicit grants and row-level security policies for every operational table;
- database tests and CI.

It does not migrate production data, configure secrets, link a remote project,
or authorize a remote migration. In particular, the 25,263 exported records
remain outside this change.

The `labcozinha_migration` schema is intentionally absent from the Data API
schema list. `anon` and `authenticated` receive no privileges. The server-side
`service_role` may update only operational batch state, completion counters,
finish time, and notes. Batch identity and provenance remain immutable; raw
records, ID mappings, and rejects are append-only. Its key must never be
exposed to the browser. Default privileges keep future tables and sequences
closed until a later migration grants access explicitly. This bootstrap creates
no routines; any later routine must revoke its default `PUBLIC` execution grant
in the same migration that creates it.

All non-database local services are disabled in this bootstrap. Auth, Storage,
Realtime, Edge Runtime, Studio, SMTP, Analytics, and the Data API remain out of
scope until their respective migration phases are reviewed.

## Operational access model

- `anon` has no privileges on operational tables.
- `authenticated` can read active catalogs and its own records.
- Personal writes require ownership; catalog writes use `service_role`.
- Entitlements and payments are readable by their owner but writable only by
  the backend.
- Cost calculations and their items are append-only historical snapshots.
- Cost settings use the approved production-volume allocation model; the
  deprecated per-recipe hourly-cost model is not part of the operational schema.
- Cost module, trial, sales, and checkout flags default to disabled.
- Administrative policies use the signed `app_metadata.role = admin` claim;
  authorization is never read from user-editable metadata.
- Base44 identifiers are protected from authenticated client writes and remain
  reserved for controlled migration and reconciliation.
- All ownership, foreign-key, and RLS lookup columns are indexed.

The Data API remains disabled in `config.toml`. Enabling it is a separate,
reviewed frontend integration step.

## Local verification

Prerequisites: Docker-compatible runtime and Supabase CLI `2.116.0`.

```bash
supabase start
supabase db reset --local
supabase db lint --level error
supabase test db
supabase stop --no-backup
```

`db reset --local` is destructive only to the local development database. Do
not replace it with `--linked` or a database URL.

## Guardrails

The following commands are outside this bootstrap and require a separately
reviewed runbook, a sealed target project, backup/restore evidence, and an
explicitly authorized operator and window:

```text
supabase link
supabase db push
supabase db reset --linked
```
