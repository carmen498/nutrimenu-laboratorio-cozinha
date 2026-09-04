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
  actual_legacy_relations text[];
  actual_function_execute_grantees text[];
  expected_policy_qual constant text :=
    '((id = auth.uid()) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))';
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

  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    where relation.oid = 'public.profiles'::regclass
      and relation.relowner = 'postgres'::regrole
      and relation.relrowsecurity
      and not relation.relforcerowsecurity
  ) then
    raise exception 'reconciliation stopped: public.profiles owner or RLS contract changed';
  end if;

  if (
    select count(*) <> 32
      or count(*) filter (
        where (
          case
            when acl.grantee = 0 then 'PUBLIC'
            else pg_catalog.pg_get_userbyid(acl.grantee)
          end
        ) = any (array['postgres', 'anon', 'authenticated', 'service_role'])
          and acl.privilege_type = any (
            array[
              'DELETE',
              'INSERT',
              'MAINTAIN',
              'REFERENCES',
              'SELECT',
              'TRIGGER',
              'TRUNCATE',
              'UPDATE'
            ]
          )
          and not acl.is_grantable
      ) <> 32
    from pg_catalog.pg_class as relation
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r'::"char", relation.relowner)
      )
    ) as acl
    where relation.oid = 'public.profiles'::regclass
  ) then
    raise exception 'reconciliation stopped: public.profiles ACL contract changed';
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
          and permissive = 'PERMISSIVE'
          and cmd = 'SELECT'
          and roles = array['authenticated']::name[]
          and qual = expected_policy_qual
          and with_check is null
      ) <> 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  ) then
    raise exception 'reconciliation stopped: public.profiles policy contract changed';
  end if;

  select array_agg(
    format('%s|%s', relation.relkind::text, relation.relname)
    order by
      case when relation.relkind = 'S' then 0 else 1 end,
      relation.relname
  )
  into actual_legacy_relations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'labcozinha'
    and relation.relkind in ('r', 'p', 'S', 'v', 'm', 'f');

  if actual_legacy_relations is distinct from array[
    'S|reconciliation_report_id_seq',
    'r|id_map',
    'r|migration_batch',
    'r|reconciliation_report',
    'r|records',
    'r|storage_manifest',
    'r|user_profiles_shadow'
  ]::text[] or exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'labcozinha'
  ) then
    raise exception 'reconciliation stopped: labcozinha object inventory changed';
  end if;

  if exists (
    select 1
    from (
      select namespace.nspowner as owner_oid, acl.grantee
      from pg_catalog.pg_namespace as namespace
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          namespace.nspacl,
          pg_catalog.acldefault('n'::"char", namespace.nspowner)
        )
      ) as acl
      where namespace.nspname = 'labcozinha'

      union all

      select relation.relowner, acl.grantee
      from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          relation.relacl,
          pg_catalog.acldefault(
            case
              when relation.relkind = 'S' then 's'::"char"
              else 'r'::"char"
            end,
            relation.relowner
          )
        )
      ) as acl
      where namespace.nspname = 'labcozinha'
        and relation.relkind in ('r', 'p', 'S', 'v', 'm', 'f')

      union all

      select routine.proowner, acl.grantee
      from pg_catalog.pg_proc as routine
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = routine.pronamespace
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          routine.proacl,
          pg_catalog.acldefault('f'::"char", routine.proowner)
        )
      ) as acl
      where namespace.nspname = 'labcozinha'
    ) as object_acl
    where object_acl.grantee <> object_acl.owner_oid
  ) then
    raise exception 'reconciliation stopped: labcozinha has a non-owner grant';
  end if;

  select routine.oid::regprocedure
  into legacy_function
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  join pg_catalog.pg_language as language
    on language.oid = routine.prolang
  where namespace.nspname = 'public'
    and routine.proname = 'rls_auto_enable'
    and pg_catalog.pg_get_function_identity_arguments(routine.oid) = ''
    and routine.proowner = 'postgres'::regrole
    and routine.prorettype = 'event_trigger'::regtype
    and routine.prokind = 'f'
    and language.lanname = 'plpgsql'
    and routine.provolatile = 'v'
    and routine.proparallel = 'u'
    and not routine.proleakproof
    and routine.prosecdef
    and routine.proconfig = array['search_path=pg_catalog']
    -- Hash of the documented event-trigger body. Structural attributes are
    -- validated separately above so a body drift cannot pass the preflight.
    and md5(routine.prosrc) = '99be20677b456ea8d3be47bdd44fb369';

  if legacy_function is null then
    raise exception 'reconciliation stopped: public.rls_auto_enable() contract changed';
  end if;

  if (
    select count(*) <> 1
      or count(*) filter (
        where event_trigger.evtname = 'ensure_rls'
          and event_trigger.evtevent = 'ddl_command_end'
          and event_trigger.evtenabled = 'O'
          and event_trigger.evttags::text[] = array[
            'CREATE TABLE',
            'CREATE TABLE AS',
            'SELECT INTO'
          ]::text[]
          and event_trigger.evtfoid = legacy_function::oid
      ) <> 1
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtname = 'ensure_rls'
      or event_trigger.evtfoid = legacy_function::oid
  ) then
    raise exception 'reconciliation stopped: ensure_rls event trigger contract changed';
  end if;

  select array_agg(
    case
      when acl.grantee = 0 then 'PUBLIC'
      else pg_catalog.pg_get_userbyid(acl.grantee)
    end
    order by
      case
        when acl.grantee = 0 then 'PUBLIC'
        else pg_catalog.pg_get_userbyid(acl.grantee)
      end
  )
  into actual_function_execute_grantees
  from pg_catalog.pg_proc as routine
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      routine.proacl,
      pg_catalog.acldefault('f'::"char", routine.proowner)
    )
  ) as acl
  where routine.oid = legacy_function::oid
    and acl.privilege_type = 'EXECUTE'
    and not acl.is_grantable;

  if actual_function_execute_grantees is distinct from array[
    'PUBLIC',
    'anon',
    'authenticated',
    'postgres',
    'service_role'
  ]::text[] and actual_function_execute_grantees is distinct from array[
    'postgres',
    'service_role'
  ]::text[] then
    raise exception 'reconciliation stopped: public.rls_auto_enable() ACL contract changed';
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
