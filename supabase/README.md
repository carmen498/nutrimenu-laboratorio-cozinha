# Supabase database bootstrap

This directory is the reproducible, local-only database foundation for the
Base44 to Supabase migration.

## Scope

The bootstrap contains only:

- the Supabase CLI configuration;
- a private landing and reconciliation schema;
- database tests and CI.

It does not define product-domain tables, migrate production data, configure
secrets, link a remote project, or authorize a remote migration.

The `labcozinha_migration` schema is intentionally absent from the Data API
schema list. `anon` and `authenticated` receive no privileges. The server-side
`service_role` may update only operational batch state, completion counters,
finish time, and notes. Batch identity and provenance remain immutable; raw
records, ID mappings, and rejects are append-only. Its key must never be
exposed to the browser. Default privileges keep future tables, sequences, and
functions closed until a later migration grants access explicitly.

All non-database local services are disabled in this bootstrap. Auth, Storage,
Realtime, Edge Runtime, Studio, SMTP, Analytics, and the Data API remain out of
scope until their respective migration phases are reviewed.

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
