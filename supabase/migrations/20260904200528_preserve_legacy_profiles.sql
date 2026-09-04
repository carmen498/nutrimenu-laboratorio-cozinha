begin;

do $migration$
declare
  actual_columns text[];
  expected_columns constant text[] := array[
    'id|uuid|NO',
    'source_user_id|text|NO',
    'full_name|text|YES',
    'email|text|NO',
    'role|text|NO',
    'telefone_whatsapp|text|YES',
    'empresa|text|YES',
    'plano_atual|text|YES',
    'status_assinatura|text|YES',
    'data_inicio|date|YES',
    'data_expiracao|date|YES',
    'trial_modelo|text|YES',
    'trial_dias_uso|jsonb|NO',
    'data_proxima_cobranca|date|YES',
    'ciclo_renovacao|int4|NO',
    'pagamento_ativo_id|text|YES',
    'cpf_cnpj|text|YES',
    'razao_social|text|YES',
    'cep|text|YES',
    'cidade_uf|text|YES',
    'endereco|text|YES',
    'segmento|text|YES',
    'origem|text|YES',
    'termos_aceitos_em|timestamptz|YES',
    'termos_versao_aceita|text|YES',
    'privacidade_versao_aceita|text|YES',
    'force_password_reset|bool|NO',
    'source_created_at|timestamptz|YES',
    'source_updated_at|timestamptz|YES',
    'migrated_at|timestamptz|NO'
  ];
  actual_constraints text[];
  expected_constraints constant text[] := array[
    'profiles_id_fkey|f|FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'profiles_pkey|p|PRIMARY KEY (id)',
    'profiles_role_check|c|CHECK (role = ANY (ARRAY[''admin''::text, ''user''::text]))',
    'profiles_source_user_id_key|u|UNIQUE (source_user_id)'
  ];
  actual_legacy_tables text[];
  legacy_function regprocedure;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'reconciliation stopped: public.profiles does not exist';
  end if;

  if to_regclass('labcozinha.profiles_legacy') is not null then
    raise exception 'reconciliation stopped: labcozinha.profiles_legacy already exists';
  end if;

  select array_agg(
    format('%s|%s|%s', column_name, udt_name, is_nullable)
    order by ordinal_position
  )
  into actual_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles';

  if actual_columns is distinct from expected_columns then
    raise exception 'reconciliation stopped: public.profiles column contract changed';
  end if;

  if (
    select count(*) <> 4
      or count(*) filter (
        where column_name = 'trial_dias_uso'
          and column_default = '''[]''::jsonb'
      ) <> 1
      or count(*) filter (
        where column_name = 'ciclo_renovacao'
          and column_default = '0'
      ) <> 1
      or count(*) filter (
        where column_name = 'force_password_reset'
          and column_default = 'true'
      ) <> 1
      or count(*) filter (
        where column_name = 'migrated_at'
          and column_default = 'now()'
      ) <> 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_default is not null
  ) then
    raise exception 'reconciliation stopped: public.profiles defaults changed';
  end if;

  select array_agg(
    format('%s|%s|%s', conname, contype, pg_get_constraintdef(oid, true))
    order by conname
  )
  into actual_constraints
  from pg_catalog.pg_constraint
  where conrelid = 'public.profiles'::regclass;

  if actual_constraints is distinct from expected_constraints then
    raise exception 'reconciliation stopped: public.profiles constraints changed';
  end if;

  if to_regprocedure('auth.jwt()') is null then
    if exists (
      select 1
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
    ) then
      raise exception 'reconciliation stopped: unexpected local profiles policy';
    end if;
  elsif (
    select count(*) <> 1
      or count(*) filter (
        where policyname = 'profile owner or admin read'
          and cmd = 'SELECT'
          and roles = array['authenticated']::name[]
      ) <> 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  ) then
    raise exception 'reconciliation stopped: public.profiles policy contract changed';
  end if;

  select array_agg(tablename::text order by tablename)
  into actual_legacy_tables
  from pg_catalog.pg_tables
  where schemaname = 'labcozinha';

  if actual_legacy_tables is distinct from array[
    'id_map',
    'migration_batch',
    'reconciliation_report',
    'records',
    'storage_manifest',
    'user_profiles_shadow'
  ]::text[] then
    raise exception 'reconciliation stopped: labcozinha table inventory changed';
  end if;

  select p.oid::regprocedure
  into legacy_function
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'rls_auto_enable'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    and p.prosecdef
    and p.proconfig = array['search_path=pg_catalog'];

  if legacy_function is null then
    raise exception 'reconciliation stopped: public.rls_auto_enable() contract changed';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    left join auth.users as auth_user on auth_user.id = profile.id
    where auth_user.id is null
  ) then
    raise exception 'reconciliation stopped: a legacy profile has no auth.users match';
  end if;

  if exists (
    select 1
    from public.profiles
    where btrim(source_user_id) = ''
  ) then
    raise exception 'reconciliation stopped: source_user_id is blank';
  end if;

  if (
    select count(*) <> count(distinct source_user_id)
    from public.profiles
  ) then
    raise exception 'reconciliation stopped: source_user_id is duplicated';
  end if;

  if exists (
    select 1
    from public.profiles
    where full_name is null or btrim(full_name) = ''
  ) then
    raise exception 'reconciliation stopped: full_name is blank';
  end if;

  if exists (
    select 1
    from public.profiles
    where segmento is not null
      and segmento not in (
        'Nutricionista',
        'Chef de Cozinha',
        'Cozinha Industrial',
        'Estudante',
        'Fabricante de Produtos'
      )
  ) then
    raise exception 'reconciliation stopped: segmento is outside the canonical domain';
  end if;

  if exists (
    select 1
    from public.profiles
    where origem is not null
      and origem not in (
        'Google',
        'Instagram',
        'Indicação de amigos',
        'Site',
        'Outros'
      )
  ) then
    raise exception 'reconciliation stopped: origem is outside the canonical domain';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    join auth.users as auth_user on auth_user.id = profile.id
    where coalesce(auth_user.raw_app_meta_data ->> 'role', '') <> profile.role
  ) then
    raise exception 'reconciliation stopped: profile role differs from Auth app_metadata';
  end if;
end
$migration$;

alter table public.profiles rename to profiles_legacy;
alter table public.profiles_legacy set schema labcozinha;

revoke all on schema labcozinha from public, anon, authenticated, service_role;
revoke all on all tables in schema labcozinha
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema labcozinha
  from public, anon, authenticated, service_role;
revoke all on all functions in schema labcozinha
  from public, anon, authenticated, service_role;

alter table labcozinha.records enable row level security;
alter table labcozinha.records force row level security;
alter table labcozinha.id_map enable row level security;
alter table labcozinha.id_map force row level security;
alter table labcozinha.migration_batch enable row level security;
alter table labcozinha.migration_batch force row level security;
alter table labcozinha.user_profiles_shadow enable row level security;
alter table labcozinha.user_profiles_shadow force row level security;
alter table labcozinha.storage_manifest enable row level security;
alter table labcozinha.storage_manifest force row level security;
alter table labcozinha.reconciliation_report enable row level security;
alter table labcozinha.reconciliation_report force row level security;
alter table labcozinha.profiles_legacy enable row level security;
alter table labcozinha.profiles_legacy force row level security;

alter default privileges for role postgres in schema labcozinha
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema labcozinha
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema labcozinha
  revoke all on functions from public, anon, authenticated, service_role;

revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated;

commit;
