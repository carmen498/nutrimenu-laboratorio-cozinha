begin;

do $migration$
declare
  actual_columns text[];
  expected_columns constant text[] := array[
    'user_id|uuid|NO',
    'legacy_id|text|YES',
    'display_name|text|NO',
    'phone|text|YES',
    'occupation|text|YES',
    'professional_registration|text|YES',
    'business_name|text|YES',
    'tax_id|text|YES',
    'legal_name|text|YES',
    'postal_code|text|YES',
    'city_state|text|YES',
    'address|text|YES',
    'professional_segment|text|YES',
    'acquisition_source|text|YES',
    'locale|text|NO',
    'timezone|text|NO',
    'onboarding_completed|bool|NO',
    'last_login_at|timestamptz|YES',
    'terms_accepted_at|timestamptz|YES',
    'terms_version|text|YES',
    'privacy_version|text|YES',
    'created_at|timestamptz|NO',
    'updated_at|timestamptz|NO'
  ];
begin
  if to_regclass('labcozinha.profiles_legacy') is null then
    raise exception 'reconciliation stopped: legacy profile snapshot does not exist';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'reconciliation stopped: canonical public.profiles does not exist';
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
    raise exception 'reconciliation stopped: canonical public.profiles contract changed';
  end if;

  if exists (select 1 from public.profiles) then
    raise exception 'reconciliation stopped: canonical public.profiles is not empty';
  end if;

  if exists (
    select 1
    from labcozinha.profiles_legacy as profile
    left join auth.users as auth_user on auth_user.id = profile.id
    where auth_user.id is null
  ) then
    raise exception 'reconciliation stopped: a legacy profile has no auth.users match';
  end if;

  if exists (
    select 1
    from labcozinha.profiles_legacy
    where full_name is null or btrim(full_name) = ''
  ) then
    raise exception 'reconciliation stopped: full_name is blank';
  end if;

  if exists (
    select 1
    from labcozinha.profiles_legacy
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
    from labcozinha.profiles_legacy
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
end
$migration$;

insert into public.profiles (
  user_id,
  legacy_id,
  display_name,
  phone,
  business_name,
  tax_id,
  legal_name,
  postal_code,
  city_state,
  address,
  professional_segment,
  acquisition_source,
  last_login_at,
  terms_accepted_at,
  terms_version,
  privacy_version,
  created_at,
  updated_at
)
select
  legacy.id,
  legacy.source_user_id,
  btrim(legacy.full_name),
  legacy.telefone_whatsapp,
  legacy.empresa,
  legacy.cpf_cnpj,
  legacy.razao_social,
  legacy.cep,
  legacy.cidade_uf,
  legacy.endereco,
  legacy.segmento,
  legacy.origem,
  auth_user.last_sign_in_at,
  legacy.termos_aceitos_em,
  legacy.termos_versao_aceita,
  legacy.privacidade_versao_aceita,
  coalesce(legacy.source_created_at, legacy.migrated_at),
  coalesce(legacy.source_updated_at, legacy.migrated_at)
from labcozinha.profiles_legacy as legacy
join auth.users as auth_user on auth_user.id = legacy.id;

do $migration$
begin
  if (
    select count(*) from public.profiles
  ) <> (
    select count(*) from labcozinha.profiles_legacy
  ) then
    raise exception 'reconciliation stopped: canonical and legacy profile counts differ';
  end if;

  if exists (
    select 1
    from labcozinha.profiles_legacy as legacy
    join auth.users as auth_user on auth_user.id = legacy.id
    left join public.profiles as canonical on canonical.user_id = legacy.id
    where canonical.user_id is null
      or canonical.legacy_id is distinct from legacy.source_user_id
      or canonical.display_name is distinct from btrim(legacy.full_name)
      or canonical.phone is distinct from legacy.telefone_whatsapp
      or canonical.business_name is distinct from legacy.empresa
      or canonical.tax_id is distinct from legacy.cpf_cnpj
      or canonical.legal_name is distinct from legacy.razao_social
      or canonical.postal_code is distinct from legacy.cep
      or canonical.city_state is distinct from legacy.cidade_uf
      or canonical.address is distinct from legacy.endereco
      or canonical.professional_segment is distinct from legacy.segmento
      or canonical.acquisition_source is distinct from legacy.origem
      or canonical.last_login_at is distinct from auth_user.last_sign_in_at
      or canonical.terms_accepted_at is distinct from legacy.termos_aceitos_em
      or canonical.terms_version is distinct from legacy.termos_versao_aceita
      or canonical.privacy_version is distinct from legacy.privacidade_versao_aceita
      or canonical.created_at is distinct from coalesce(
        legacy.source_created_at,
        legacy.migrated_at
      )
      or canonical.updated_at is distinct from coalesce(
        legacy.source_updated_at,
        legacy.migrated_at
      )
  ) then
    raise exception 'reconciliation stopped: a mapped profile differs from its legacy source';
  end if;
end
$migration$;

commit;
