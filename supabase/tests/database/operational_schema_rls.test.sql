begin;

select plan(26);

select ok(
  (
    select count(*) = 32
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind = 'r'
      and relation.relname = any (array[
        'profiles', 'products', 'plans', 'user_entitlements', 'payments',
        'ingredients', 'user_ingredients', 'household_measures',
        'ingredient_synonyms', 'tags', 'standard_utensils', 'event_references',
        'supplies', 'recipes', 'recipe_items', 'recipe_supplies', 'recipe_tags',
        'recipe_forgotten_ingredients', 'menus', 'menu_recipes', 'menu_supplies',
        'menu_tags', 'menu_periods', 'menu_period_items', 'event_plans',
        'shopping_lists', 'shopping_list_items', 'cart_items',
        'cost_user_settings', 'cost_expenses', 'cost_calculations',
        'cost_calculation_items'
      ])
  ),
  'the complete operational table set exists'
);

select is_empty(
  $$
    select 'profiles' where exists (select 1 from public.profiles)
    union all select 'products' where exists (select 1 from public.products)
    union all select 'plans' where exists (select 1 from public.plans)
    union all select 'user_entitlements' where exists (select 1 from public.user_entitlements)
    union all select 'payments' where exists (select 1 from public.payments)
    union all select 'ingredients' where exists (select 1 from public.ingredients)
    union all select 'user_ingredients' where exists (select 1 from public.user_ingredients)
    union all select 'household_measures' where exists (select 1 from public.household_measures)
    union all select 'ingredient_synonyms' where exists (select 1 from public.ingredient_synonyms)
    union all select 'tags' where exists (select 1 from public.tags)
    union all select 'standard_utensils' where exists (select 1 from public.standard_utensils)
    union all select 'event_references' where exists (select 1 from public.event_references)
    union all select 'supplies' where exists (select 1 from public.supplies)
    union all select 'recipes' where exists (select 1 from public.recipes)
    union all select 'recipe_items' where exists (select 1 from public.recipe_items)
    union all select 'recipe_supplies' where exists (select 1 from public.recipe_supplies)
    union all select 'recipe_tags' where exists (select 1 from public.recipe_tags)
    union all select 'recipe_forgotten_ingredients' where exists (select 1 from public.recipe_forgotten_ingredients)
    union all select 'menus' where exists (select 1 from public.menus)
    union all select 'menu_recipes' where exists (select 1 from public.menu_recipes)
    union all select 'menu_supplies' where exists (select 1 from public.menu_supplies)
    union all select 'menu_tags' where exists (select 1 from public.menu_tags)
    union all select 'menu_periods' where exists (select 1 from public.menu_periods)
    union all select 'menu_period_items' where exists (select 1 from public.menu_period_items)
    union all select 'event_plans' where exists (select 1 from public.event_plans)
    union all select 'shopping_lists' where exists (select 1 from public.shopping_lists)
    union all select 'shopping_list_items' where exists (select 1 from public.shopping_list_items)
    union all select 'cart_items' where exists (select 1 from public.cart_items)
    union all select 'cost_user_settings' where exists (select 1 from public.cost_user_settings)
    union all select 'cost_expenses' where exists (select 1 from public.cost_expenses)
    union all select 'cost_calculations' where exists (select 1 from public.cost_calculations)
    union all select 'cost_calculation_items' where exists (select 1 from public.cost_calculation_items)
  $$,
  'schema migration imports no operational records'
);

select ok(
  (
    select count(*) = 32 and bool_and(relation.relrowsecurity and relation.relforcerowsecurity)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind = 'r'
      and relation.relname = any (array[
        'profiles', 'products', 'plans', 'user_entitlements', 'payments',
        'ingredients', 'user_ingredients', 'household_measures',
        'ingredient_synonyms', 'tags', 'standard_utensils', 'event_references',
        'supplies', 'recipes', 'recipe_items', 'recipe_supplies', 'recipe_tags',
        'recipe_forgotten_ingredients', 'menus', 'menu_recipes', 'menu_supplies',
        'menu_tags', 'menu_periods', 'menu_period_items', 'event_plans',
        'shopping_lists', 'shopping_list_items', 'cart_items',
        'cost_user_settings', 'cost_expenses', 'cost_calculations',
        'cost_calculation_items'
      ])
  ),
  'RLS is enabled and forced on every operational table'
);

select ok(
  (
    select count(distinct relation.relname) = 32
    from pg_catalog.pg_policy as policy
    join pg_catalog.pg_class as relation on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any (array[
        'profiles', 'products', 'plans', 'user_entitlements', 'payments',
        'ingredients', 'user_ingredients', 'household_measures',
        'ingredient_synonyms', 'tags', 'standard_utensils', 'event_references',
        'supplies', 'recipes', 'recipe_items', 'recipe_supplies', 'recipe_tags',
        'recipe_forgotten_ingredients', 'menus', 'menu_recipes', 'menu_supplies',
        'menu_tags', 'menu_periods', 'menu_period_items', 'event_plans',
        'shopping_lists', 'shopping_list_items', 'cart_items',
        'cost_user_settings', 'cost_expenses', 'cost_calculations',
        'cost_calculation_items'
      ])
  ),
  'every operational table has an explicit policy'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_constraint as foreign_key
    join pg_catalog.pg_class as relation on relation.oid = foreign_key.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    cross join lateral unnest(foreign_key.conkey) as key_column(attnum)
    where namespace.nspname = 'public'
      and foreign_key.contype = 'f'
      and relation.relname = any (array[
        'profiles', 'products', 'plans', 'user_entitlements', 'payments',
        'ingredients', 'user_ingredients', 'household_measures',
        'ingredient_synonyms', 'tags', 'standard_utensils', 'event_references',
        'supplies', 'recipes', 'recipe_items', 'recipe_supplies', 'recipe_tags',
        'recipe_forgotten_ingredients', 'menus', 'menu_recipes', 'menu_supplies',
        'menu_tags', 'menu_periods', 'menu_period_items', 'event_plans',
        'shopping_lists', 'shopping_list_items', 'cart_items',
        'cost_user_settings', 'cost_expenses', 'cost_calculations',
        'cost_calculation_items'
      ])
      and not exists (
        select 1
        from pg_catalog.pg_index as index_definition
        where index_definition.indrelid = foreign_key.conrelid
          and index_definition.indisvalid
          and index_definition.indisready
          and index_definition.indkey[0] = key_column.attnum
      )
  ),
  'every foreign-key column is indexed for joins and RLS lookups'
);

select ok(
  (
    select count(*) = 32 and bool_and(
      not has_table_privilege('anon', relation.oid, 'SELECT')
      and not has_table_privilege('anon', relation.oid, 'INSERT')
      and not has_table_privilege('anon', relation.oid, 'UPDATE')
      and not has_table_privilege('anon', relation.oid, 'DELETE')
    )
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind = 'r'
      and relation.relname = any (array[
        'profiles', 'products', 'plans', 'user_entitlements', 'payments',
        'ingredients', 'user_ingredients', 'household_measures',
        'ingredient_synonyms', 'tags', 'standard_utensils', 'event_references',
        'supplies', 'recipes', 'recipe_items', 'recipe_supplies', 'recipe_tags',
        'recipe_forgotten_ingredients', 'menus', 'menu_recipes', 'menu_supplies',
        'menu_tags', 'menu_periods', 'menu_period_items', 'event_plans',
        'shopping_lists', 'shopping_list_items', 'cart_items',
        'cost_user_settings', 'cost_expenses', 'cost_calculations',
        'cost_calculation_items'
      ])
  ),
  'anon has no CRUD privileges on operational tables'
);

select ok(
  (
    select bool_and(
      has_table_privilege('authenticated', table_name, 'SELECT')
      and not has_table_privilege('authenticated', table_name, 'INSERT')
      and not has_table_privilege('authenticated', table_name, 'UPDATE')
      and not has_table_privilege('authenticated', table_name, 'DELETE')
    )
    from unnest(array[
      'public.products', 'public.plans', 'public.ingredients',
      'public.household_measures', 'public.ingredient_synonyms', 'public.tags',
      'public.standard_utensils', 'public.event_references'
    ]) as catalogs(table_name)
  ),
  'authenticated users have read-only catalog privileges'
);

select ok(
  (
    select bool_and(
      has_table_privilege('authenticated', table_name, 'SELECT')
      and not has_table_privilege('authenticated', table_name, 'INSERT')
      and not has_table_privilege('authenticated', table_name, 'UPDATE')
      and not has_table_privilege('authenticated', table_name, 'DELETE')
    )
    from unnest(array[
      'public.user_entitlements', 'public.payments',
      'public.cost_calculations', 'public.cost_calculation_items'
    ]) as history(table_name)
  ),
  'commercial and cost history is read-only for authenticated users'
);

select ok(
  (
    select bool_and(
      has_table_privilege('service_role', table_name, 'SELECT')
      and has_table_privilege('service_role', table_name, 'INSERT')
      and not has_table_privilege('service_role', table_name, 'UPDATE')
      and not has_table_privilege('service_role', table_name, 'DELETE')
    )
    from unnest(array[
      'public.cost_calculations', 'public.cost_calculation_items'
    ]) as cost_history(table_name)
  ),
  'cost calculations are append-only for service_role'
);

insert into auth.users (id)
values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

insert into public.products (id, code, name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'lab-cozinha', 'Laboratório de Cozinha');

insert into public.plans (id, product_id, code, name, billing_interval, price_cents)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'mensal',
  'Mensal',
  'month',
  4900
);

insert into public.ingredients (id, name, normalized_name, base_unit)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Arroz', 'arroz', 'g');

insert into public.recipes (id, owner_id, is_base, name, status)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', null, true, 'Receita base', 'published'),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    '11111111-1111-4111-8111-111111111111',
    false,
    'Receita A',
    'draft'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    '22222222-2222-4222-8222-222222222222',
    false,
    'Receita B',
    'draft'
  );

insert into public.recipe_items (
  id, recipe_id, item_type, ingredient_id, quantity, unit
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  'ingredient',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  100,
  'g'
);

insert into public.menus (id, owner_id, is_base, name)
values (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  '22222222-2222-4222-8222-222222222222',
  false,
  'Cardápio B'
);

insert into public.user_entitlements (
  id, user_id, product_id, plan_id, status, source
)
values
  (
    '99999999-9999-4999-8999-999999999991',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'active',
    'fixture'
  ),
  (
    '99999999-9999-4999-8999-999999999992',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'active',
    'fixture'
  );

insert into public.payments (
  id, user_id, product_id, plan_id, provider, provider_payment_id, status, amount_cents
)
values
  (
    '88888888-8888-4888-8888-888888888881',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'mercado_pago',
    'payment-a',
    'approved',
    4900
  ),
  (
    '88888888-8888-4888-8888-888888888882',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'mercado_pago',
    'payment-b',
    'approved',
    4900
  );

insert into public.cost_calculations (
  id,
  owner_id,
  recipe_id,
  servings,
  ingredient_cost_cents,
  total_cost_cents,
  suggested_price_cents
)
values
  (
    '77777777-7777-4777-8777-777777777771',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    10,
    1000,
    1000,
    2000
  ),
  (
    '77777777-7777-4777-8777-777777777772',
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    10,
    1200,
    1200,
    2400
  );

insert into public.cost_expenses (id, owner_id, category, description, amount_cents, recurrence)
values (
  '66666666-6666-4666-8666-666666666661',
  '22222222-2222-4222-8222-222222222222',
  'fixed',
  'Despesa B',
  10000,
  'month'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","app_metadata":{"role":"user"}}',
  true
);

select lives_ok(
  $$insert into public.profiles (user_id, display_name) values ('11111111-1111-4111-8111-111111111111', 'Owner A')$$,
  'a user can create its own profile'
);

select throws_ok(
  $$insert into public.profiles (user_id, display_name) values ('22222222-2222-4222-8222-222222222222', 'Owner B')$$,
  '42501',
  null,
  'a user cannot create another user profile'
);

select results_eq(
  $$select id from public.recipes order by id$$,
  array[
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid
  ],
  'a user reads catalog recipes and its own recipes only'
);

select lives_ok(
  $$
    insert into public.recipes (id, owner_id, is_base, name)
    values (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
      '11111111-1111-4111-8111-111111111111',
      false,
      'Nova receita A'
    )
  $$,
  'a user can create a personal recipe'
);

select throws_ok(
  $$
    insert into public.recipes (owner_id, is_base, name)
    values (null, true, 'Catálogo indevido')
  $$,
  '42501',
  null,
  'a non-admin cannot create a catalog recipe'
);

select throws_ok(
  $$
    insert into public.recipes (owner_id, is_base, name)
    values ('22222222-2222-4222-8222-222222222222', false, 'Receita indevida')
  $$,
  '42501',
  null,
  'a user cannot assign a personal recipe to another owner'
);

select is_empty(
  $$select id from public.recipe_items where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'$$,
  'children of another user recipe are hidden'
);

select throws_ok(
  $$
    insert into public.recipe_items (
      recipe_id, item_type, subrecipe_id, quantity, unit
    )
    values (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      'subrecipe',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      1,
      'receita'
    )
  $$,
  '42501',
  null,
  'a user cannot attach another user private subrecipe'
);

select throws_ok(
  $$
    insert into public.event_plans (owner_id, menu_id, name, guest_count)
    values (
      '11111111-1111-4111-8111-111111111111',
      'ffffffff-ffff-4fff-8fff-fffffffffff1',
      'Evento indevido',
      20
    )
  $$,
  '42501',
  null,
  'a user cannot link an event to another user private menu'
);

select is(
  (select count(*) from public.user_entitlements),
  1::bigint,
  'entitlements are isolated by user'
);

select is(
  (select count(*) from public.payments),
  1::bigint,
  'payments are isolated by user'
);

select is(
  (select count(*) from public.cost_calculations),
  1::bigint,
  'cost calculations are isolated by user'
);

select throws_ok(
  $$update public.cost_calculations set suggested_price_cents = 3000$$,
  '42501',
  null,
  'authenticated users cannot rewrite historical cost calculations'
);

select lives_ok(
  $$
    insert into public.cost_expenses (
      owner_id, category, description, amount_cents, recurrence
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'fixed',
      'Despesa A',
      9000,
      'month'
    )
  $$,
  'a user can create its own cost expense'
);

select is(
  (select count(*) from public.cost_expenses),
  1::bigint,
  'cost expenses are isolated by user'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);

select is(
  (select count(*) from public.recipes),
  4::bigint,
  'an admin can read every recipe'
);

select lives_ok(
  $$insert into public.recipes (owner_id, is_base, name) values (null, true, 'Nova receita base')$$,
  'an admin can create a catalog recipe'
);

select * from finish();
rollback;
