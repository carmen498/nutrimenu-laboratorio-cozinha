begin;

create schema if not exists labcozinha_migration;

comment on schema labcozinha_migration is
  'Private landing and reconciliation schema for the Base44 to Supabase migration.';

revoke all on schema labcozinha_migration from public, anon, authenticated;
grant usage on schema labcozinha_migration to service_role;

create table labcozinha_migration.batches (
  id bigint generated always as identity primary key,
  export_id text not null unique,
  source_system text not null default 'base44',
  phase text not null,
  status text not null default 'received',
  source_snapshot_at timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_count bigint,
  accepted_count bigint,
  rejected_count bigint,
  source_checksum text,
  manifest jsonb not null default '{}'::jsonb,
  notes text,
  constraint batches_export_id_not_blank check (btrim(export_id) <> ''),
  constraint batches_source_system_not_blank check (btrim(source_system) <> ''),
  constraint batches_phase_not_blank check (btrim(phase) <> ''),
  constraint batches_status_check check (
    status in ('received', 'loading', 'loaded', 'validated', 'rejected', 'rolled_back')
  ),
  constraint batches_source_count_check check (source_count is null or source_count >= 0),
  constraint batches_accepted_count_check check (accepted_count is null or accepted_count >= 0),
  constraint batches_rejected_count_check check (rejected_count is null or rejected_count >= 0),
  constraint batches_counts_check check (
    source_count is null
    or coalesce(accepted_count, 0) + coalesce(rejected_count, 0) <= source_count
  ),
  constraint batches_finished_at_check check (finished_at is null or finished_at >= started_at),
  constraint batches_manifest_object_check check (jsonb_typeof(manifest) = 'object')
);

create table labcozinha_migration.raw_records (
  batch_id bigint not null,
  entity_name text not null,
  source_id text not null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_owner_id text,
  source_checksum text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  primary key (batch_id, entity_name, source_id),
  constraint raw_records_batch_fk foreign key (batch_id)
    references labcozinha_migration.batches(id) on delete restrict,
  constraint raw_records_entity_name_not_blank check (btrim(entity_name) <> ''),
  constraint raw_records_source_id_not_blank check (btrim(source_id) <> ''),
  constraint raw_records_source_checksum_not_blank check (btrim(source_checksum) <> ''),
  constraint raw_records_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create table labcozinha_migration.id_map (
  entity_name text not null,
  source_id text not null,
  target_schema text not null,
  target_table text not null,
  target_id text not null,
  batch_id bigint not null,
  mapped_at timestamptz not null default now(),
  primary key (entity_name, source_id),
  unique (target_schema, target_table, target_id),
  constraint id_map_batch_fk foreign key (batch_id)
    references labcozinha_migration.batches(id) on delete restrict,
  constraint id_map_entity_name_not_blank check (btrim(entity_name) <> ''),
  constraint id_map_source_id_not_blank check (btrim(source_id) <> ''),
  constraint id_map_target_schema_not_blank check (btrim(target_schema) <> ''),
  constraint id_map_target_table_not_blank check (btrim(target_table) <> ''),
  constraint id_map_target_id_not_blank check (btrim(target_id) <> '')
);

create table labcozinha_migration.rejects (
  id bigint generated always as identity primary key,
  batch_id bigint not null,
  entity_name text,
  source_id text,
  reason_code text not null,
  raw_payload jsonb,
  details jsonb not null default '{}'::jsonb,
  rejected_at timestamptz not null default now(),
  constraint rejects_batch_fk foreign key (batch_id)
    references labcozinha_migration.batches(id) on delete restrict,
  constraint rejects_reason_code_not_blank check (btrim(reason_code) <> ''),
  constraint rejects_raw_payload_object_check check (
    raw_payload is null or jsonb_typeof(raw_payload) = 'object'
  ),
  constraint rejects_details_object_check check (jsonb_typeof(details) = 'object')
);

create index id_map_batch_id_idx
  on labcozinha_migration.id_map (batch_id);
create index rejects_batch_reason_idx
  on labcozinha_migration.rejects (batch_id, reason_code);

alter table labcozinha_migration.batches enable row level security;
alter table labcozinha_migration.batches force row level security;
alter table labcozinha_migration.raw_records enable row level security;
alter table labcozinha_migration.raw_records force row level security;
alter table labcozinha_migration.id_map enable row level security;
alter table labcozinha_migration.id_map force row level security;
alter table labcozinha_migration.rejects enable row level security;
alter table labcozinha_migration.rejects force row level security;

revoke all on all tables in schema labcozinha_migration from public, anon, authenticated;
revoke all on all sequences in schema labcozinha_migration from public, anon, authenticated;
revoke all on all tables in schema labcozinha_migration from service_role;
revoke all on all sequences in schema labcozinha_migration from service_role;
grant select, insert, update on labcozinha_migration.batches to service_role;
grant select, insert on
  labcozinha_migration.raw_records,
  labcozinha_migration.id_map,
  labcozinha_migration.rejects
to service_role;
grant usage, select on all sequences in schema labcozinha_migration to service_role;

alter default privileges in schema labcozinha_migration
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema labcozinha_migration
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema labcozinha_migration
  revoke all on tables from service_role;
alter default privileges in schema labcozinha_migration
  revoke all on sequences from service_role;

commit;
