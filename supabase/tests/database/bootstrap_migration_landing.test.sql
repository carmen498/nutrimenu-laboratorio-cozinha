begin;

select plan(12);

select has_schema(
  'labcozinha_migration',
  'private migration schema exists'
);

select has_table(
  'labcozinha_migration',
  'batches',
  'migration batches table exists'
);
select has_table(
  'labcozinha_migration',
  'raw_records',
  'raw landing records table exists'
);
select has_table(
  'labcozinha_migration',
  'id_map',
  'legacy-to-target id map exists'
);
select has_table(
  'labcozinha_migration',
  'rejects',
  'migration rejects table exists'
);

select ok(
  (
    select count(*) = 4
    from pg_catalog.pg_tables
    where schemaname = 'labcozinha_migration'
  ),
  'bootstrap creates only the four migration-control tables'
);

select ok(
  not has_schema_privilege('anon', 'labcozinha_migration', 'USAGE'),
  'anon cannot access the private migration schema'
);
select ok(
  not has_schema_privilege('authenticated', 'labcozinha_migration', 'USAGE'),
  'authenticated cannot access the private migration schema'
);
select ok(
  has_schema_privilege('service_role', 'labcozinha_migration', 'USAGE'),
  'service_role can access the private migration schema'
);

select ok(
  (
    select count(*) = 4 and bool_and(c.relrowsecurity and c.relforcerowsecurity)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'r'
  ),
  'all migration-control tables have RLS enabled and forced'
);

select ok(
  (
    select count(*) = 4
    from pg_catalog.pg_constraint as c
    join pg_catalog.pg_namespace as n on n.oid = c.connamespace
    where n.nspname = 'labcozinha_migration'
      and c.contype = 'p'
  ),
  'all migration-control tables have primary keys'
);

select ok(
  (
    select count(*) = 3
    from pg_catalog.pg_constraint as c
    join pg_catalog.pg_namespace as n on n.oid = c.connamespace
    where n.nspname = 'labcozinha_migration'
      and c.contype = 'f'
  ),
  'landing, id map, and rejects reference a migration batch'
);

select * from finish();
rollback;
