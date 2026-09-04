begin;

select plan(27);

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
    select count(*) = 4 and bool_and(
      not has_table_privilege('anon', c.oid, 'SELECT')
      and not has_table_privilege('anon', c.oid, 'INSERT')
      and not has_table_privilege('anon', c.oid, 'UPDATE')
      and not has_table_privilege('anon', c.oid, 'DELETE')
      and not has_table_privilege('anon', c.oid, 'TRUNCATE')
      and not has_table_privilege('anon', c.oid, 'REFERENCES')
      and not has_table_privilege('anon', c.oid, 'TRIGGER')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'r'
  ),
  'anon has no CRUD privileges on migration-control tables'
);
select ok(
  (
    select count(*) = 4 and bool_and(
      not has_table_privilege('authenticated', c.oid, 'SELECT')
      and not has_table_privilege('authenticated', c.oid, 'INSERT')
      and not has_table_privilege('authenticated', c.oid, 'UPDATE')
      and not has_table_privilege('authenticated', c.oid, 'DELETE')
      and not has_table_privilege('authenticated', c.oid, 'TRUNCATE')
      and not has_table_privilege('authenticated', c.oid, 'REFERENCES')
      and not has_table_privilege('authenticated', c.oid, 'TRIGGER')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'r'
  ),
  'authenticated has no CRUD privileges on migration-control tables'
);
select ok(
  (
    select count(*) = 2 and bool_and(
      not has_sequence_privilege('anon', c.oid, 'USAGE')
      and not has_sequence_privilege('anon', c.oid, 'SELECT')
      and not has_sequence_privilege('anon', c.oid, 'UPDATE')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'S'
  ),
  'anon has no privileges on migration-control sequences'
);
select ok(
  (
    select count(*) = 2 and bool_and(
      not has_sequence_privilege('authenticated', c.oid, 'USAGE')
      and not has_sequence_privilege('authenticated', c.oid, 'SELECT')
      and not has_sequence_privilege('authenticated', c.oid, 'UPDATE')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'S'
  ),
  'authenticated has no privileges on migration-control sequences'
);
select ok(
  (
    select has_table_privilege('service_role', 'labcozinha_migration.batches', 'SELECT')
      and has_table_privilege('service_role', 'labcozinha_migration.batches', 'INSERT')
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'status', 'UPDATE'
      )
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'finished_at', 'UPDATE'
      )
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'source_count', 'UPDATE'
      )
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'accepted_count', 'UPDATE'
      )
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'rejected_count', 'UPDATE'
      )
      and has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'notes', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'id', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'export_id', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'source_system', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'phase', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'source_snapshot_at', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'started_at', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'source_checksum', 'UPDATE'
      )
      and not has_column_privilege(
        'service_role', 'labcozinha_migration.batches', 'manifest', 'UPDATE'
      )
      and not has_table_privilege('service_role', 'labcozinha_migration.batches', 'DELETE')
      and not has_table_privilege('service_role', 'labcozinha_migration.batches', 'TRUNCATE')
      and not has_table_privilege('service_role', 'labcozinha_migration.batches', 'REFERENCES')
      and not has_table_privilege('service_role', 'labcozinha_migration.batches', 'TRIGGER')
  ),
  'service_role may update operational batch fields but not identity or provenance'
);
select ok(
  (
    select count(*) = 3 and bool_and(
      has_table_privilege('service_role', c.oid, 'SELECT')
      and has_table_privilege('service_role', c.oid, 'INSERT')
      and not has_table_privilege('service_role', c.oid, 'UPDATE')
      and not has_table_privilege('service_role', c.oid, 'DELETE')
      and not has_table_privilege('service_role', c.oid, 'TRUNCATE')
      and not has_table_privilege('service_role', c.oid, 'REFERENCES')
      and not has_table_privilege('service_role', c.oid, 'TRIGGER')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relname in ('raw_records', 'id_map', 'rejects')
      and c.relkind = 'r'
  ),
  'landing evidence is append-only for service_role'
);
select ok(
  (
    select count(*) = 2 and bool_and(
      has_sequence_privilege('service_role', c.oid, 'USAGE')
      and not has_sequence_privilege('service_role', c.oid, 'SELECT')
      and not has_sequence_privilege('service_role', c.oid, 'UPDATE')
    )
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
      and c.relkind = 'S'
  ),
  'service_role has only usage access to identity sequences'
);
select ok(
  (
    select count(*) = 0
    from pg_catalog.pg_policy as p
    join pg_catalog.pg_class as c on c.oid = p.polrelid
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'labcozinha_migration'
  ),
  'private migration tables expose no row policies to client roles'
);

insert into labcozinha_migration.batches (export_id, phase)
values ('rls-sentinel', 'bootstrap');

set local role service_role;
select lives_ok(
  $$update labcozinha_migration.batches set status = 'loading' where export_id = 'rls-sentinel'$$,
  'service_role can update operational batch state'
);
select throws_ok(
  $$update labcozinha_migration.batches set export_id = 'rewritten' where export_id = 'rls-sentinel'$$,
  '42501',
  null,
  'service_role cannot rewrite batch identity'
);
reset role;

grant usage on schema labcozinha_migration to anon, authenticated;
grant select, insert on labcozinha_migration.batches to anon, authenticated;
grant usage on sequence labcozinha_migration.batches_id_seq to anon, authenticated;

set local role anon;
select results_eq(
  $$select count(*) from labcozinha_migration.batches$$,
  array[0::bigint],
  'RLS hides every migration batch from anon even if ACLs drift'
);
select throws_ok(
  $$insert into labcozinha_migration.batches (export_id, phase) values ('anon-attempt', 'bootstrap')$$,
  '42501',
  null,
  'RLS blocks anon inserts even if ACLs drift'
);
reset role;

set local role authenticated;
select results_eq(
  $$select count(*) from labcozinha_migration.batches$$,
  array[0::bigint],
  'RLS hides every migration batch from authenticated even if ACLs drift'
);
select throws_ok(
  $$insert into labcozinha_migration.batches (export_id, phase) values ('authenticated-attempt', 'bootstrap')$$,
  '42501',
  null,
  'RLS blocks authenticated inserts even if ACLs drift'
);
reset role;

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

set local role postgres;

create table labcozinha_migration.default_acl_probe (
  id bigint generated always as identity primary key
);

reset role;

select ok(
  (
    select bool_and(
      not has_table_privilege(
        role_name,
        'labcozinha_migration.default_acl_probe',
        privilege_name
      )
    )
    from unnest(array['anon', 'authenticated', 'service_role']) as roles(role_name)
    cross join unnest(
      array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    ) as privileges(privilege_name)
  )
  and (
    select bool_and(
      not has_sequence_privilege(
        role_name,
        'labcozinha_migration.default_acl_probe_id_seq',
        privilege_name
      )
    )
    from unnest(array['anon', 'authenticated', 'service_role']) as roles(role_name)
    cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) as privileges(privilege_name)
  ),
  'future tables and sequences remain private by default'
);

select * from finish();
rollback;
