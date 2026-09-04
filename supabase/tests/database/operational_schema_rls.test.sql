begin;

select no_plan();

create temporary table expected_operational_tables (
  table_name text primary key,
  access_mode text not null
) on commit drop;

insert into expected_operational_tables (table_name, access_mode)
values
  ('profiles', 'profile'),
  ('profile_admin_notes', 'admin_only'),
  ('products', 'read_only'),
  ('plans', 'read_only'),
  ('product_feature_flags', 'read_only'),
  ('user_entitlements', 'read_only'),
  ('payments', 'read_only'),
  ('ingredients', 'read_only'),
  ('user_ingredients', 'owner_crud'),
  ('household_measures', 'read_only'),
  ('ingredient_synonyms', 'read_only'),
  ('tags', 'read_only'),
  ('standard_utensils', 'read_only'),
  ('event_references', 'read_only'),
  ('supplies', 'owner_crud'),
  ('recipes', 'owner_crud'),
  ('recipe_items', 'owner_crud'),
  ('recipe_supplies', 'owner_crud'),
  ('recipe_tags', 'owner_crud'),
  ('recipe_forgotten_ingredients', 'owner_crud'),
  ('menus', 'owner_crud'),
  ('menu_recipes', 'owner_crud'),
  ('menu_supplies', 'owner_crud'),
  ('menu_tags', 'owner_crud'),
  ('menu_periods', 'owner_crud'),
  ('menu_period_items', 'owner_crud'),
  ('event_plans', 'owner_crud'),
  ('shopping_lists', 'owner_crud'),
  ('shopping_list_items', 'owner_crud'),
  ('cart_items', 'owner_crud'),
  ('cost_user_settings', 'owner_crud'),
  ('cost_expenses', 'owner_crud'),
  ('cost_calculations', 'read_only'),
  ('cost_calculation_items', 'read_only');

create function pg_temp.operational_row_count()
returns bigint
language plpgsql
as $$
declare
  name text;
  row_count bigint;
  total bigint := 0;
begin
  for name in select table_name from expected_operational_tables
  loop
    execute format('select count(*) from public.%I', name) into row_count;
    total := total + row_count;
  end loop;
  return total;
end;
$$;

select is(
  (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    join expected_operational_tables as expected on expected.table_name = relation.relname
    where namespace.nspname = 'public' and relation.relkind = 'r'
  ),
  34::bigint,
  'the complete operational table set exists'
);

select is(pg_temp.operational_row_count(), 0::bigint, 'the schema migration imports no records');

select ok(
  (
    select count(*) = 34 and bool_and(relation.relrowsecurity and relation.relforcerowsecurity)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    join expected_operational_tables as expected on expected.table_name = relation.relname
    where namespace.nspname = 'public' and relation.relkind = 'r'
  ),
  'RLS is enabled and forced on every operational table'
);

select is_empty(
  $$
    select relation.relname
    from pg_catalog.pg_policy as policy
    join pg_catalog.pg_class as relation on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and policy.polcmd = '*'
  $$,
  'no RLS policy uses FOR ALL'
);

select is_empty(
  $$
    with expected_commands as (
      select expected.table_name, command
      from expected_operational_tables as expected
      cross join lateral unnest(
        case expected.access_mode
          when 'owner_crud' then array['r', 'a', 'w', 'd']::text[]
          when 'admin_only' then array['r', 'a', 'w', 'd']::text[]
          when 'profile' then array['r', 'a', 'w']::text[]
          else array['r']::text[]
        end
      ) as command
    )
    select expected.table_name || ':' || expected.command
    from expected_commands as expected
    where not exists (
      select 1
      from pg_catalog.pg_policy as policy
      join pg_catalog.pg_class as relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = expected.table_name
        and policy.polcmd = expected.command
        and policy.polroles = array['authenticated'::regrole::oid]
    )
  $$,
  'every allowed operation has an explicit authenticated policy'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_constraint as foreign_key
    join pg_catalog.pg_class as relation on relation.oid = foreign_key.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    join expected_operational_tables as expected on expected.table_name = relation.relname
    cross join lateral unnest(foreign_key.conkey) as key_column(attnum)
    where namespace.nspname = 'public'
      and foreign_key.contype = 'f'
      and not exists (
        select 1
        from pg_catalog.pg_index as index_definition
        where index_definition.indrelid = foreign_key.conrelid
          and index_definition.indisvalid
          and index_definition.indisready
          and key_column.attnum = any(index_definition.indkey)
      )
  ),
  'every foreign-key column is indexed'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_constraint as foreign_key
    join pg_catalog.pg_class as relation on relation.oid = foreign_key.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    join expected_operational_tables as expected on expected.table_name = relation.relname
    where namespace.nspname = 'public'
      and foreign_key.contype = 'f'
      and foreign_key.convalidated
  ),
  'foreign keys remain NOT VALID until data reconciliation'
);

select ok(
  (
    select count(*) = 34 and bool_and(
      not has_table_privilege('anon', relation.oid, 'SELECT')
      and not has_table_privilege('anon', relation.oid, 'INSERT')
      and not has_table_privilege('anon', relation.oid, 'UPDATE')
      and not has_table_privilege('anon', relation.oid, 'DELETE')
    )
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    join expected_operational_tables as expected on expected.table_name = relation.relname
    where namespace.nspname = 'public' and relation.relkind = 'r'
  ),
  'anon has no CRUD privileges on operational tables'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'legacy_id', 'INSERT')
  and not has_column_privilege('authenticated', 'public.profiles', 'legacy_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'last_login_at', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'terms_accepted_at', 'UPDATE'),
  'profile migration and system fields are protected by column privileges'
);

select ok(
  (
    select bool_and(
      has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
    )
    from expected_operational_tables
    where access_mode = 'read_only'
  ),
  'catalogs and histories are read-only for authenticated users'
);

select ok(
  has_table_privilege('service_role', 'public.cost_calculations', 'SELECT')
  and has_table_privilege('service_role', 'public.cost_calculations', 'INSERT')
  and not has_table_privilege('service_role', 'public.cost_calculations', 'UPDATE')
  and not has_table_privilege('service_role', 'public.cost_calculations', 'DELETE')
  and has_table_privilege('service_role', 'public.cost_calculation_items', 'INSERT')
  and not has_table_privilege('service_role', 'public.cost_calculation_items', 'UPDATE')
  and not has_table_privilege('service_role', 'public.cost_calculation_items', 'DELETE'),
  'cost history is append-only for service_role'
);

select is(
  (select array_agg(column_name::text order by column_name::text)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'plans'
     and column_name = any (array['duration_days', 'price_cents', 'is_trial', 'is_popular', 'sale_enabled', 'offer_version', 'display_order', 'benefits'])),
  array['benefits', 'display_order', 'duration_days', 'is_popular', 'is_trial', 'offer_version', 'price_cents', 'sale_enabled']::text[],
  'plans contain the approved fixed-duration commercial contract'
);

select is(
  (select array_agg(column_name::text order by column_name::text)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'cost_user_settings'
     and column_name = any (array['monthly_estimated_volume', 'business_cost_groups', 'apply_business_cost', 'business_cost_basis', 'production_days_month', 'average_recipes_day', 'commercialization_cost_pct', 'apply_commercialization_cost', 'default_margin_pct', 'active'])),
  array['active', 'apply_business_cost', 'apply_commercialization_cost', 'average_recipes_day', 'business_cost_basis', 'business_cost_groups', 'commercialization_cost_pct', 'default_margin_pct', 'monthly_estimated_volume', 'production_days_month']::text[],
  'cost settings contain the approved allocation model'
);

select is_empty(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'cost_user_settings'
      and column_name in ('hourly_labor_cost_cents', 'overhead_percentage', 'waste_percentage', 'tax_percentage')$$,
  'deprecated hourly and percentage cost model is absent'
);

select is(
  (select array_agg(column_name::text order by column_name::text)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'cost_calculations'
     and column_name = any (array['parent_calculation_id', 'root_calculation_id', 'version_number', 'yield_snapshot', 'portion_snapshot', 'technical_engine_version', 'ingredient_cost_snapshot', 'recipe_supply_cost_snapshot', 'forgotten_ingredient_cost_snapshot', 'additional_input_snapshot', 'business_cost_snapshot', 'commercialization_snapshot'])),
  array['additional_input_snapshot', 'business_cost_snapshot', 'commercialization_snapshot', 'forgotten_ingredient_cost_snapshot', 'ingredient_cost_snapshot', 'parent_calculation_id', 'portion_snapshot', 'recipe_supply_cost_snapshot', 'root_calculation_id', 'technical_engine_version', 'version_number', 'yield_snapshot']::text[],
  'cost history contains lineage and immutable snapshots'
);

select ok(
  (
    select count(*) = 4 and bool_and(column_default = 'false')
    from information_schema.columns
    where table_schema = 'public' and table_name = 'product_feature_flags'
      and column_name in ('costs_module_enabled', 'costs_trial_enabled', 'costs_sales_enabled', 'costs_checkout_enabled')
  ),
  'all Cost feature flags default to disabled'
);

insert into auth.users (id)
values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

insert into public.products (id, code, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'laboratorio_cozinha', 'Laboratório de Cozinha'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'laboratorio_custos', 'Laboratório de Custos');

insert into public.product_feature_flags (product_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');

insert into public.plans (id, product_id, code, name, duration_days, price_cents, display_period, sale_enabled, offer_version, benefits)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'custos_mensal', 'Custos 30 dias', 30, 4900, 'mes', false, 'v1', '["Fichas de custo"]'::jsonb);

insert into public.ingredients (id, name, normalized_name, base_unit)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Arroz', 'arroz', 'g');

insert into public.tags (id, name, normalized_name, group_code, color)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'Molho', 'molho', 'molho', 'verde');

insert into public.supplies (id, owner_id, name, category, unit)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '11111111-1111-4111-8111-111111111111', 'Papel', 'material', 'folha'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', '22222222-2222-4222-8222-222222222222', 'Caixa', 'embalagem', 'unidade');

insert into public.recipes (id, owner_id, is_base, name, status)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', null, true, 'Receita base', 'published'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '11111111-1111-4111-8111-111111111111', false, 'Receita A', 'draft'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '22222222-2222-4222-8222-222222222222', false, 'Receita B', 'draft');

insert into public.recipe_items (id, recipe_id, item_type, ingredient_id, quantity, unit)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'ingredient', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 100, 'g');

insert into public.menus (id, owner_id, is_base, name)
values ('ffffffff-ffff-4fff-8fff-fffffffffff1', '22222222-2222-4222-8222-222222222222', false, 'Cardápio B');

insert into public.payments (id, user_id, product_id, plan_id, purchase_scope, provider, provider_payment_id, idempotency_key, payment_method, status, amount_cents, costs_amount_cents)
values
  ('88888888-8888-4888-8888-888888888881', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'laboratorio_custos', 'mercado_pago', 'payment-a', 'idem-a', 'pix', 'approved', 4900, 4900),
  ('88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'laboratorio_custos', 'mercado_pago', 'payment-b', 'idem-b', 'pix', 'approved', 4900, 4900);

insert into public.user_entitlements (id, user_id, product_id, plan_id, status, mode, source, starts_at, payment_id)
values
  ('99999999-9999-4999-8999-999999999991', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'ativo', '30_dias', 'checkout', now(), '88888888-8888-4888-8888-888888888881'),
  ('99999999-9999-4999-8999-999999999992', '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'ativo', '30_dias', 'checkout', now(), '88888888-8888-4888-8888-888888888882');

insert into public.cost_calculations (
  id, user_id, recipe_id, status, quantity_recipes, yield_snapshot,
  portion_snapshot, ingredient_cost_snapshot, recipe_supply_cost_snapshot,
  forgotten_ingredient_cost_snapshot, additional_input_snapshot,
  business_cost_snapshot, commercialization_snapshot, technical_engine_version,
  technical_cost_total_cents, business_cost_total_cents,
  production_cost_total_cents, cost_per_recipe_cents, cost_per_portion_cents,
  sale_price_cents, margin_pct, markup, price_mode
)
values
  ('77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'finalizado', 10, '{}', '{}', '[]', '[]', '[]', '[]', '{}', '{}', '2', 1000, 200, 1200, 120, 12, 2400, 50, 2, 'por_receita'),
  ('77777777-7777-4777-8777-777777777772', '22222222-2222-4222-8222-222222222222', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'finalizado', 10, '{}', '{}', '[]', '[]', '[]', '[]', '{}', '{}', '2', 1200, 200, 1400, 140, 14, 2800, 50, 2, 'por_receita');

insert into public.cost_calculation_items (id, calculation_id, user_id, type, description, quantity, unit_value_cents, total_value_cents)
values
  ('55555555-5555-4555-8555-555555555551', '77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', 'ingredientes', 'Ingredientes A', 1, 1000, 1000),
  ('55555555-5555-4555-8555-555555555552', '77777777-7777-4777-8777-777777777772', '22222222-2222-4222-8222-222222222222', 'ingredientes', 'Ingredientes B', 1, 1200, 1200);

insert into public.cost_expenses (id, user_id, group_code, name, monthly_value_cents)
values ('66666666-6666-4666-8666-666666666661', '22222222-2222-4222-8222-222222222222', 'gastos_negocio', 'Despesa B', 10000);

set local role anon;
select throws_ok($$select * from public.recipes$$, '42501', null, 'anon cannot read operational data');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","app_metadata":{"role":"user"}}', true);

select lives_ok($$insert into public.profiles (user_id, display_name) values ('11111111-1111-4111-8111-111111111111', 'Owner A')$$, 'a user can create its own profile');
select throws_ok($$insert into public.profiles (user_id, display_name) values ('22222222-2222-4222-8222-222222222222', 'Owner B')$$, '42501', null, 'a user cannot create another profile');
select throws_ok($$insert into public.profiles (user_id, display_name, legacy_id) values ('11111111-1111-4111-8111-111111111111', 'Duplicate', 'legacy-user')$$, '42501', null, 'a client cannot reserve a legacy identifier');
select is((select count(*) from public.profile_admin_notes), 0::bigint, 'admin notes are hidden from owners');

select results_eq(
  $$select id from public.recipes order by id$$,
  array['cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid],
  'a user reads catalog recipes and its own recipes only'
);

select lives_ok($$insert into public.recipes (id, owner_id, is_base, name) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', '11111111-1111-4111-8111-111111111111', false, 'Nova receita A')$$, 'a user can create a personal recipe');
select throws_ok($$insert into public.recipes (owner_id, is_base, name) values (null, true, 'Catálogo indevido')$$, '42501', null, 'a non-admin cannot create a catalog recipe');
select throws_ok($$insert into public.recipes (owner_id, is_base, name) values ('22222222-2222-4222-8222-222222222222', false, 'Receita indevida')$$, '42501', null, 'a user cannot assign a personal recipe to another owner');

select results_eq($$select id from public.supplies order by id$$, array['dddddddd-dddd-4ddd-8ddd-ddddddddddd3'::uuid], 'supplies are strictly owner-scoped');
select is_empty($$select id from public.recipe_items where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'$$, 'children of another user recipe are hidden');

select throws_ok(
  $$insert into public.recipe_items (recipe_id, item_type, subrecipe_id, quantity, unit) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'subrecipe', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 1, 'receita')$$,
  '42501', null, 'a user cannot attach another user private subrecipe'
);

select throws_ok(
  $$insert into public.event_plans (owner_id, menu_id, name, guest_count) values ('11111111-1111-4111-8111-111111111111', 'ffffffff-ffff-4fff-8fff-fffffffffff1', 'Evento indevido', 20)$$,
  '42501', null, 'a user cannot link an event to another private menu'
);

select is((select count(*) from public.user_entitlements), 1::bigint, 'entitlements are isolated by user');
select is((select count(*) from public.payments), 1::bigint, 'payments are isolated by user');
select is((select count(*) from public.cost_calculations), 1::bigint, 'cost calculations are isolated by user');
select is((select count(*) from public.cost_calculation_items), 1::bigint, 'cost calculation items are isolated by user');

select throws_ok($$update public.cost_calculations set sale_price_cents = 3000$$, '42501', null, 'authenticated users cannot rewrite cost history');
select throws_ok($$delete from public.cost_calculation_items$$, '42501', null, 'authenticated users cannot delete cost history');

select lives_ok($$insert into public.cost_user_settings (user_id, monthly_estimated_volume) values ('11111111-1111-4111-8111-111111111111', 40)$$, 'a user can create its own cost settings');
select lives_ok($$insert into public.cost_expenses (user_id, group_code, name, monthly_value_cents) values ('11111111-1111-4111-8111-111111111111', 'producao', 'Gás', 9000)$$, 'a user can create an approved cost expense');
select throws_ok($$insert into public.cost_expenses (user_id, group_code, name, monthly_value_cents) values ('11111111-1111-4111-8111-111111111111', 'fixed', 'Inválida', 1)$$, '23514', null, 'unapproved cost groups are rejected');
select is((select count(*) from public.cost_expenses), 1::bigint, 'cost expenses are isolated by user');
select throws_ok($$update public.product_feature_flags set costs_checkout_enabled = true$$, '42501', null, 'authenticated clients cannot enable Cost checkout');

reset role;

select lives_ok(
  $$insert into public.user_entitlements (user_id, product_id, status, mode, source, starts_at, trial_started_at) values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'expirado', 'trial', 'trial', now(), now())$$,
  'the first trial for a product is accepted'
);
select throws_ok(
  $$insert into public.user_entitlements (user_id, product_id, status, mode, source, starts_at, trial_started_at) values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'expirado', 'trial', 'trial', now(), now())$$,
  '23505', null, 'a user can never receive a second trial for the same product'
);

select lives_ok(
  $$insert into public.cost_calculations (
      id, user_id, recipe_id, parent_calculation_id, root_calculation_id,
      version_number, status, quantity_recipes, yield_snapshot, portion_snapshot,
      ingredient_cost_snapshot, recipe_supply_cost_snapshot,
      forgotten_ingredient_cost_snapshot, additional_input_snapshot,
      business_cost_snapshot, commercialization_snapshot,
      technical_engine_version, technical_cost_total_cents,
      business_cost_total_cents, production_cost_total_cents,
      cost_per_recipe_cents, cost_per_portion_cents, sale_price_cents,
      margin_pct, markup, price_mode
    )
    select '77777777-7777-4777-8777-777777777773', user_id, recipe_id, id, id,
      2, 'recalculado', quantity_recipes, yield_snapshot, portion_snapshot,
      ingredient_cost_snapshot, recipe_supply_cost_snapshot,
      forgotten_ingredient_cost_snapshot, additional_input_snapshot,
      business_cost_snapshot, commercialization_snapshot,
      technical_engine_version, technical_cost_total_cents,
      business_cost_total_cents, production_cost_total_cents,
      cost_per_recipe_cents, cost_per_portion_cents, sale_price_cents,
      margin_pct, markup, price_mode
    from public.cost_calculations where id = '77777777-7777-4777-8777-777777777771'$$,
  'a recalculation creates the next immutable version'
);

select throws_ok(
  $$insert into public.cost_calculations (
      id, user_id, recipe_id, parent_calculation_id, root_calculation_id,
      version_number, status, quantity_recipes, yield_snapshot, portion_snapshot,
      ingredient_cost_snapshot, recipe_supply_cost_snapshot,
      forgotten_ingredient_cost_snapshot, additional_input_snapshot,
      business_cost_snapshot, commercialization_snapshot,
      technical_engine_version, technical_cost_total_cents,
      business_cost_total_cents, production_cost_total_cents,
      cost_per_recipe_cents, cost_per_portion_cents, sale_price_cents,
      margin_pct, markup, price_mode
    )
    select '77777777-7777-4777-8777-777777777774', user_id, recipe_id, id, id,
      2, 'recalculado', quantity_recipes, yield_snapshot, portion_snapshot,
      ingredient_cost_snapshot, recipe_supply_cost_snapshot,
      forgotten_ingredient_cost_snapshot, additional_input_snapshot,
      business_cost_snapshot, commercialization_snapshot,
      technical_engine_version, technical_cost_total_cents,
      business_cost_total_cents, production_cost_total_cents,
      cost_per_recipe_cents, cost_per_portion_cents, sale_price_cents,
      margin_pct, markup, price_mode
    from public.cost_calculations where id = '77777777-7777-4777-8777-777777777771'$$,
  '23505', null, 'a calculation lineage cannot branch from the same parent'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","app_metadata":{"role":"admin"}}', true);

select is((select count(*) from public.recipes), 4::bigint, 'an admin can read every recipe');
select lives_ok($$insert into public.profile_admin_notes (user_id, notes) values ('11111111-1111-4111-8111-111111111111', 'Contato confirmado')$$, 'an admin can maintain private profile notes');
select lives_ok($$insert into public.recipes (owner_id, is_base, name) values (null, true, 'Nova receita base')$$, 'an admin can create a catalog recipe');

select * from finish();
rollback;
