begin;

select plan(19);

select has_schema(
  'labcozinha',
  'legacy schema remains available as a private snapshot'
);

select has_table(
  'labcozinha',
  'profiles_legacy',
  'the legacy profile table is preserved'
);

select has_table(
  'public',
  'profiles',
  'the canonical profile table exists'
);

select is(
  (
    select array_agg(
      format('%s|%s|%s', column_name, udt_name, is_nullable)
      order by ordinal_position
    )
    from information_schema.columns
    where table_schema = 'labcozinha'
      and table_name = 'profiles_legacy'
  ),
  array[
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
  ]::text[],
  'all 30 legacy profile columns are preserved'
);

select is(
  (
    select array_agg(conname::text order by conname)
    from pg_catalog.pg_constraint
    where conrelid = 'labcozinha.profiles_legacy'::regclass
  ),
  array[
    'profiles_id_fkey',
    'profiles_pkey',
    'profiles_role_check',
    'profiles_source_user_id_key'
  ]::text[],
  'legacy profile constraints are preserved'
);

select is(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.columns
    where table_schema = 'labcozinha'
      and table_name = 'profiles_legacy'
      and column_name = any (array[
        'plano_atual',
        'status_assinatura',
        'data_inicio',
        'data_expiracao',
        'trial_modelo',
        'trial_dias_uso',
        'data_proxima_cobranca',
        'ciclo_renovacao',
        'pagamento_ativo_id'
      ])
  ),
  array[
    'ciclo_renovacao',
    'data_expiracao',
    'data_inicio',
    'data_proxima_cobranca',
    'pagamento_ativo_id',
    'plano_atual',
    'status_assinatura',
    'trial_dias_uso',
    'trial_modelo'
  ]::text[],
  'commercial fields remain only in the legacy snapshot'
);

select is(
  (
    select array_agg(tablename::text order by tablename)
    from pg_catalog.pg_tables
    where schemaname = 'labcozinha'
  ),
  array[
    'id_map',
    'migration_batch',
    'profiles_legacy',
    'reconciliation_report',
    'records',
    'storage_manifest',
    'user_profiles_shadow'
  ]::text[],
  'legacy schema contains the expected seven tables'
);

select ok(
  (
    select count(*) = 7
      and bool_and(relation.relrowsecurity and relation.relforcerowsecurity)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'labcozinha'
      and relation.relkind = 'r'
  ),
  'all legacy tables have RLS enabled and forced'
);

select ok(
  not has_schema_privilege('anon', 'labcozinha', 'USAGE'),
  'anon cannot use the legacy schema'
);

select ok(
  not has_schema_privilege('authenticated', 'labcozinha', 'USAGE'),
  'authenticated cannot use the legacy schema'
);

select ok(
  not has_schema_privilege('service_role', 'labcozinha', 'USAGE'),
  'service_role cannot use the legacy schema'
);

select ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE'),
  'anon cannot execute the legacy SECURITY DEFINER function'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as routine
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        routine.proacl,
        pg_catalog.acldefault('f'::"char", routine.proowner)
      )
    ) as acl
    where routine.oid = 'public.rls_auto_enable()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute the legacy SECURITY DEFINER function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rls_auto_enable()',
    'EXECUTE'
  ),
  'authenticated cannot execute the legacy SECURITY DEFINER function'
);

select is(
  (select count(*) from public.profiles),
  (select count(*) from labcozinha.profiles_legacy),
  'canonical and legacy profile counts match after reconciliation'
);

select ok(
  (
    select count(*) = 7
      and bool_and(
        not has_table_privilege('anon', relation.oid, 'SELECT')
        and not has_table_privilege('anon', relation.oid, 'INSERT')
        and not has_table_privilege('anon', relation.oid, 'UPDATE')
        and not has_table_privilege('anon', relation.oid, 'DELETE')
      )
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'labcozinha'
      and relation.relkind = 'r'
  ),
  'anon has no CRUD privileges on legacy tables'
);

select ok(
  (
    select count(*) = 7
      and bool_and(
        not has_table_privilege('authenticated', relation.oid, 'SELECT')
        and not has_table_privilege('authenticated', relation.oid, 'INSERT')
        and not has_table_privilege('authenticated', relation.oid, 'UPDATE')
        and not has_table_privilege('authenticated', relation.oid, 'DELETE')
      )
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'labcozinha'
      and relation.relkind = 'r'
  ),
  'authenticated has no CRUD privileges on legacy tables'
);

select is_empty(
  $
    select object_acl.object_name
    from (
      select namespace.nspname::text as object_name,
             namespace.nspowner as owner_oid,
             acl.grantee
      from pg_catalog.pg_namespace as namespace
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          namespace.nspacl,
          pg_catalog.acldefault('n'::"char", namespace.nspowner)
        )
      ) as acl
      where namespace.nspname = 'labcozinha'

      union all

      select relation.oid::regclass::text,
             relation.relowner,
             acl.grantee
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
    ) as object_acl
    where object_acl.grantee <> object_acl.owner_oid
  $,
  'legacy schema and relations have no non-owner grants'
);

select is_empty(
  $
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in (
        'plano_atual',
        'status_assinatura',
        'trial_modelo',
        'pagamento_ativo_id'
      )
  $$,
  'commercial legacy fields were not copied into the canonical profile'
);

select * from finish();

rollback;
