begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  legacy_id text unique,
  display_name text not null,
  phone text,
  occupation text,
  professional_registration text,
  business_name text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> ''),
  constraint profiles_locale_not_blank check (btrim(locale) <> ''),
  constraint profiles_timezone_not_blank check (btrim(timezone) <> '')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  code text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_code_not_blank check (btrim(code) <> ''),
  constraint products_name_not_blank check (btrim(name) <> '')
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  product_id uuid not null references public.products(id) on delete restrict,
  code text not null,
  name text not null,
  billing_interval text not null,
  price_cents bigint not null,
  currency text not null default 'BRL',
  trial_days integer not null default 0,
  limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, code),
  unique (id, product_id),
  constraint plans_code_not_blank check (btrim(code) <> ''),
  constraint plans_name_not_blank check (btrim(name) <> ''),
  constraint plans_billing_interval_check check (
    billing_interval in ('one_time', 'month', 'year')
  ),
  constraint plans_price_cents_check check (price_cents >= 0),
  constraint plans_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint plans_trial_days_check check (trial_days >= 0),
  constraint plans_limits_object_check check (jsonb_typeof(limits) = 'object')
);

create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  plan_id uuid,
  status text not null,
  source text not null,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_entitlements_status_check check (
    status in ('trial', 'active', 'grace', 'suspended', 'cancelled', 'expired')
  ),
  constraint user_entitlements_source_not_blank check (btrim(source) <> ''),
  constraint user_entitlements_plan_product_fk foreign key (plan_id, product_id)
    references public.plans(id, product_id) on delete restrict,
  constraint user_entitlements_trial_dates_check check (
    trial_ends_at is null or (
      trial_started_at is not null and trial_ends_at >= trial_started_at
    )
  ),
  constraint user_entitlements_valid_dates_check check (
    valid_until is null or valid_until >= valid_from
  )
);

create unique index user_entitlements_current_uidx
  on public.user_entitlements (user_id, product_id)
  where status in ('trial', 'active', 'grace', 'suspended');
create unique index user_entitlements_single_trial_uidx
  on public.user_entitlements (user_id, product_id)
  where trial_started_at is not null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  plan_id uuid,
  provider text not null,
  provider_payment_id text,
  checkout_id text,
  external_reference text,
  status text not null,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  constraint payments_provider_not_blank check (btrim(provider) <> ''),
  constraint payments_plan_product_fk foreign key (plan_id, product_id)
    references public.plans(id, product_id) on delete restrict,
  constraint payments_status_check check (
    status in ('pending', 'approved', 'authorized', 'in_process', 'rejected', 'refunded', 'cancelled')
  ),
  constraint payments_amount_cents_check check (amount_cents >= 0),
  constraint payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_provider_payload_object_check check (
    jsonb_typeof(provider_payload) = 'object'
  )
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  normalized_name text not null unique,
  category text,
  base_unit text not null,
  density_g_ml numeric(14,6),
  yield_percent numeric(7,4) not null default 100,
  nutrition jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_name_not_blank check (btrim(name) <> ''),
  constraint ingredients_normalized_name_not_blank check (btrim(normalized_name) <> ''),
  constraint ingredients_base_unit_not_blank check (btrim(base_unit) <> ''),
  constraint ingredients_density_check check (density_g_ml is null or density_g_ml > 0),
  constraint ingredients_yield_percent_check check (yield_percent > 0 and yield_percent <= 100),
  constraint ingredients_nutrition_object_check check (jsonb_typeof(nutrition) = 'object')
);

create table public.user_ingredients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  name text not null,
  purchase_unit text not null,
  package_quantity numeric(14,4) not null,
  package_price_cents bigint not null,
  yield_percent numeric(7,4) not null default 100,
  density_g_ml numeric(14,6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_ingredients_name_not_blank check (btrim(name) <> ''),
  constraint user_ingredients_purchase_unit_not_blank check (btrim(purchase_unit) <> ''),
  constraint user_ingredients_package_quantity_check check (package_quantity > 0),
  constraint user_ingredients_package_price_check check (package_price_cents >= 0),
  constraint user_ingredients_yield_percent_check check (
    yield_percent > 0 and yield_percent <= 100
  ),
  constraint user_ingredients_density_check check (density_g_ml is null or density_g_ml > 0)
);

create table public.household_measures (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  abbreviation text,
  unit_type text not null,
  grams numeric(14,6),
  milliliters numeric(14,6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_measures_name_not_blank check (btrim(name) <> ''),
  constraint household_measures_unit_type_not_blank check (btrim(unit_type) <> ''),
  constraint household_measures_grams_check check (grams is null or grams > 0),
  constraint household_measures_milliliters_check check (milliliters is null or milliliters > 0),
  constraint household_measures_conversion_check check (grams is not null or milliliters is not null)
);

create table public.ingredient_synonyms (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  synonym text not null,
  normalized_synonym text not null unique,
  created_at timestamptz not null default now(),
  constraint ingredient_synonyms_synonym_not_blank check (btrim(synonym) <> ''),
  constraint ingredient_synonyms_normalized_not_blank check (btrim(normalized_synonym) <> '')
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  normalized_name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_blank check (btrim(name) <> ''),
  constraint tags_normalized_name_not_blank check (btrim(normalized_name) <> '')
);

create table public.standard_utensils (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  normalized_name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint standard_utensils_name_not_blank check (btrim(name) <> ''),
  constraint standard_utensils_normalized_name_not_blank check (btrim(normalized_name) <> '')
);

create table public.event_references (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  category text not null,
  value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_references_name_not_blank check (btrim(name) <> ''),
  constraint event_references_category_not_blank check (btrim(category) <> ''),
  constraint event_references_value_object_check check (jsonb_typeof(value) = 'object')
);

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid references auth.users(id) on delete restrict,
  is_base boolean not null default false,
  name text not null,
  unit text not null,
  package_quantity numeric(14,4),
  package_price_cents bigint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplies_scope_check check (
    (is_base and owner_id is null) or (not is_base and owner_id is not null)
  ),
  constraint supplies_name_not_blank check (btrim(name) <> ''),
  constraint supplies_unit_not_blank check (btrim(unit) <> ''),
  constraint supplies_package_quantity_check check (
    package_quantity is null or package_quantity > 0
  ),
  constraint supplies_package_price_check check (
    package_price_cents is null or package_price_cents >= 0
  ),
  constraint supplies_package_pair_check check (
    (package_quantity is null) = (package_price_cents is null)
  )
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid references auth.users(id) on delete restrict,
  is_base boolean not null default false,
  name text not null,
  description text,
  instructions text,
  yield_quantity numeric(14,4) not null default 1,
  yield_unit text not null default 'porção',
  preparation_minutes integer,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_scope_check check (
    (is_base and owner_id is null) or (not is_base and owner_id is not null)
  ),
  constraint recipes_name_not_blank check (btrim(name) <> ''),
  constraint recipes_yield_quantity_check check (yield_quantity > 0),
  constraint recipes_yield_unit_not_blank check (btrim(yield_unit) <> ''),
  constraint recipes_preparation_minutes_check check (
    preparation_minutes is null or preparation_minutes >= 0
  ),
  constraint recipes_status_check check (status in ('draft', 'published', 'archived'))
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  item_type text not null,
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  user_ingredient_id uuid references public.user_ingredients(id) on delete restrict,
  subrecipe_id uuid references public.recipes(id) on delete restrict,
  quantity numeric(14,4) not null,
  unit text not null,
  group_name text,
  notes text,
  sort_order integer not null default 0,
  optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_items_type_check check (
    item_type in ('ingredient', 'user_ingredient', 'subrecipe')
  ),
  constraint recipe_items_target_check check (
    (item_type = 'ingredient' and ingredient_id is not null and user_ingredient_id is null and subrecipe_id is null)
    or (item_type = 'user_ingredient' and ingredient_id is null and user_ingredient_id is not null and subrecipe_id is null)
    or (item_type = 'subrecipe' and ingredient_id is null and user_ingredient_id is null and subrecipe_id is not null)
  ),
  constraint recipe_items_no_self_reference check (subrecipe_id is null or subrecipe_id <> recipe_id),
  constraint recipe_items_quantity_check check (quantity > 0),
  constraint recipe_items_unit_not_blank check (btrim(unit) <> ''),
  constraint recipe_items_sort_order_check check (sort_order >= 0)
);

create table public.recipe_supplies (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  supply_id uuid not null references public.supplies(id) on delete restrict,
  quantity numeric(14,4) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  primary key (recipe_id, supply_id),
  constraint recipe_supplies_quantity_check check (quantity > 0)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id)
);

create table public.recipe_forgotten_ingredients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  description text not null,
  occurrence_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_forgotten_description_not_blank check (btrim(description) <> ''),
  constraint recipe_forgotten_count_check check (occurrence_count > 0)
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid references auth.users(id) on delete restrict,
  is_base boolean not null default false,
  name text not null,
  description text,
  guest_count integer,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menus_scope_check check (
    (is_base and owner_id is null) or (not is_base and owner_id is not null)
  ),
  constraint menus_name_not_blank check (btrim(name) <> ''),
  constraint menus_guest_count_check check (guest_count is null or guest_count > 0),
  constraint menus_status_check check (status in ('draft', 'published', 'archived'))
);

create table public.menu_recipes (
  menu_id uuid not null references public.menus(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  quantity numeric(14,4) not null default 1,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  primary key (menu_id, recipe_id),
  constraint menu_recipes_quantity_check check (quantity > 0),
  constraint menu_recipes_sort_order_check check (sort_order >= 0)
);

create table public.menu_supplies (
  menu_id uuid not null references public.menus(id) on delete cascade,
  supply_id uuid not null references public.supplies(id) on delete restrict,
  quantity numeric(14,4) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  primary key (menu_id, supply_id),
  constraint menu_supplies_quantity_check check (quantity > 0)
);

create table public.menu_tags (
  menu_id uuid not null references public.menus(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (menu_id, tag_id)
);

create table public.menu_periods (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  menu_id uuid not null references public.menus(id) on delete cascade,
  label text not null,
  period_type text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_periods_label_not_blank check (btrim(label) <> ''),
  constraint menu_periods_type_not_blank check (btrim(period_type) <> ''),
  constraint menu_periods_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint menu_periods_sort_order_check check (sort_order >= 0)
);

create table public.menu_period_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  menu_period_id uuid not null references public.menu_periods(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  quantity numeric(14,4) not null default 1,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_period_id, recipe_id),
  constraint menu_period_items_quantity_check check (quantity > 0),
  constraint menu_period_items_sort_order_check check (sort_order >= 0)
);

create table public.event_plans (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  menu_id uuid references public.menus(id) on delete restrict,
  name text not null,
  event_at timestamptz,
  guest_count integer not null,
  status text not null default 'draft',
  notes text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_plans_name_not_blank check (btrim(name) <> ''),
  constraint event_plans_guest_count_check check (guest_count > 0),
  constraint event_plans_status_check check (
    status in ('draft', 'planned', 'completed', 'cancelled')
  ),
  constraint event_plans_configuration_object_check check (
    jsonb_typeof(configuration) = 'object'
  )
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  event_plan_id uuid references public.event_plans(id) on delete set null,
  name text not null,
  status text not null default 'draft',
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_name_not_blank check (btrim(name) <> ''),
  constraint shopping_lists_status_check check (
    status in ('draft', 'active', 'completed', 'archived')
  )
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  user_ingredient_id uuid references public.user_ingredients(id) on delete restrict,
  description text not null,
  quantity numeric(14,4),
  unit text,
  purchased boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_one_ingredient_check check (
    not (ingredient_id is not null and user_ingredient_id is not null)
  ),
  constraint shopping_list_items_description_not_blank check (btrim(description) <> ''),
  constraint shopping_list_items_quantity_check check (quantity is null or quantity > 0),
  constraint shopping_list_items_sort_order_check check (sort_order >= 0)
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  item_type text not null,
  recipe_id uuid references public.recipes(id) on delete cascade,
  menu_id uuid references public.menus(id) on delete cascade,
  supply_id uuid references public.supplies(id) on delete cascade,
  quantity numeric(14,4) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_type_check check (item_type in ('recipe', 'menu', 'supply')),
  constraint cart_items_target_check check (
    (item_type = 'recipe' and recipe_id is not null and menu_id is null and supply_id is null)
    or (item_type = 'menu' and recipe_id is null and menu_id is not null and supply_id is null)
    or (item_type = 'supply' and recipe_id is null and menu_id is null and supply_id is not null)
  ),
  constraint cart_items_quantity_check check (quantity > 0)
);

create table public.cost_user_settings (
  user_id uuid primary key references auth.users(id) on delete restrict,
  legacy_id text unique,
  currency text not null default 'BRL',
  hourly_labor_cost_cents bigint not null default 0,
  overhead_percentage numeric(7,4) not null default 0,
  waste_percentage numeric(7,4) not null default 0,
  desired_margin_percentage numeric(7,4) not null default 0,
  tax_percentage numeric(7,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_user_settings_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint cost_user_settings_labor_check check (hourly_labor_cost_cents >= 0),
  constraint cost_user_settings_overhead_check check (overhead_percentage >= 0),
  constraint cost_user_settings_waste_check check (waste_percentage >= 0 and waste_percentage <= 100),
  constraint cost_user_settings_margin_check check (
    desired_margin_percentage >= 0 and desired_margin_percentage < 100
  ),
  constraint cost_user_settings_tax_check check (tax_percentage >= 0 and tax_percentage <= 100)
);

create table public.cost_expenses (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  category text not null,
  description text not null,
  amount_cents bigint not null,
  recurrence text not null,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_expenses_category_not_blank check (btrim(category) <> ''),
  constraint cost_expenses_description_not_blank check (btrim(description) <> ''),
  constraint cost_expenses_amount_check check (amount_cents >= 0),
  constraint cost_expenses_recurrence_check check (
    recurrence in ('one_time', 'month', 'year')
  ),
  constraint cost_expenses_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.cost_calculations (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  servings numeric(14,4) not null,
  currency text not null default 'BRL',
  ingredient_cost_cents bigint not null default 0,
  supply_cost_cents bigint not null default 0,
  labor_cost_cents bigint not null default 0,
  overhead_cost_cents bigint not null default 0,
  tax_cost_cents bigint not null default 0,
  total_cost_cents bigint not null,
  suggested_price_cents bigint not null,
  assumptions jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cost_calculations_servings_check check (servings > 0),
  constraint cost_calculations_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint cost_calculations_costs_check check (
    ingredient_cost_cents >= 0
    and supply_cost_cents >= 0
    and labor_cost_cents >= 0
    and overhead_cost_cents >= 0
    and tax_cost_cents >= 0
    and total_cost_cents >= 0
    and suggested_price_cents >= 0
  ),
  constraint cost_calculations_total_check check (
    total_cost_cents = ingredient_cost_cents + supply_cost_cents
      + labor_cost_cents + overhead_cost_cents + tax_cost_cents
  ),
  constraint cost_calculations_assumptions_object_check check (
    jsonb_typeof(assumptions) = 'object'
  )
);

create table public.cost_calculation_items (
  id uuid primary key default gen_random_uuid(),
  calculation_id uuid not null references public.cost_calculations(id) on delete restrict,
  item_type text not null,
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  user_ingredient_id uuid references public.user_ingredients(id) on delete restrict,
  supply_id uuid references public.supplies(id) on delete restrict,
  description text not null,
  quantity numeric(14,4),
  unit text,
  unit_cost_cents bigint,
  total_cost_cents bigint not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cost_calculation_items_type_check check (
    item_type in ('ingredient', 'supply', 'labor', 'overhead', 'tax', 'other')
  ),
  constraint cost_calculation_items_description_not_blank check (btrim(description) <> ''),
  constraint cost_calculation_items_quantity_check check (quantity is null or quantity > 0),
  constraint cost_calculation_items_unit_cost_check check (unit_cost_cents is null or unit_cost_cents >= 0),
  constraint cost_calculation_items_total_check check (total_cost_cents >= 0),
  constraint cost_calculation_items_snapshot_object_check check (jsonb_typeof(snapshot) = 'object')
);

create index plans_product_id_idx on public.plans (product_id);
create index user_entitlements_user_id_idx on public.user_entitlements (user_id);
create index user_entitlements_product_id_idx on public.user_entitlements (product_id);
create index user_entitlements_plan_id_idx on public.user_entitlements (plan_id);
create index payments_user_created_idx on public.payments (user_id, created_at desc);
create index payments_product_id_idx on public.payments (product_id);
create index payments_plan_id_idx on public.payments (plan_id);
create index user_ingredients_owner_id_idx on public.user_ingredients (owner_id);
create index user_ingredients_ingredient_id_idx on public.user_ingredients (ingredient_id);
create index ingredient_synonyms_ingredient_id_idx on public.ingredient_synonyms (ingredient_id);
create index supplies_owner_id_idx on public.supplies (owner_id);
create index recipes_owner_id_idx on public.recipes (owner_id);
create index recipe_items_recipe_id_idx on public.recipe_items (recipe_id);
create index recipe_items_ingredient_id_idx on public.recipe_items (ingredient_id);
create index recipe_items_user_ingredient_id_idx on public.recipe_items (user_ingredient_id);
create index recipe_items_subrecipe_id_idx on public.recipe_items (subrecipe_id);
create index recipe_supplies_supply_id_idx on public.recipe_supplies (supply_id);
create index recipe_tags_tag_id_idx on public.recipe_tags (tag_id);
create index recipe_forgotten_recipe_id_idx on public.recipe_forgotten_ingredients (recipe_id);
create index menus_owner_id_idx on public.menus (owner_id);
create index menu_recipes_recipe_id_idx on public.menu_recipes (recipe_id);
create index menu_supplies_supply_id_idx on public.menu_supplies (supply_id);
create index menu_tags_tag_id_idx on public.menu_tags (tag_id);
create index menu_periods_menu_id_idx on public.menu_periods (menu_id);
create index menu_period_items_period_id_idx on public.menu_period_items (menu_period_id);
create index menu_period_items_recipe_id_idx on public.menu_period_items (recipe_id);
create index event_plans_owner_id_idx on public.event_plans (owner_id);
create index event_plans_menu_id_idx on public.event_plans (menu_id);
create index shopping_lists_owner_id_idx on public.shopping_lists (owner_id);
create index shopping_lists_event_plan_id_idx on public.shopping_lists (event_plan_id);
create index shopping_list_items_list_id_idx on public.shopping_list_items (shopping_list_id);
create index shopping_list_items_ingredient_id_idx on public.shopping_list_items (ingredient_id);
create index shopping_list_items_user_ingredient_id_idx on public.shopping_list_items (user_ingredient_id);
create index cart_items_owner_id_idx on public.cart_items (owner_id);
create index cart_items_recipe_id_idx on public.cart_items (recipe_id);
create index cart_items_menu_id_idx on public.cart_items (menu_id);
create index cart_items_supply_id_idx on public.cart_items (supply_id);
create index cost_expenses_owner_id_idx on public.cost_expenses (owner_id);
create index cost_calculations_owner_created_idx on public.cost_calculations (owner_id, calculated_at desc);
create index cost_calculations_recipe_id_idx on public.cost_calculations (recipe_id);
create index cost_calculations_product_id_idx on public.cost_calculations (product_id);
create index cost_calculation_items_calculation_id_idx on public.cost_calculation_items (calculation_id);
create index cost_calculation_items_ingredient_id_idx on public.cost_calculation_items (ingredient_id);
create index cost_calculation_items_user_ingredient_id_idx on public.cost_calculation_items (user_ingredient_id);
create index cost_calculation_items_supply_id_idx on public.cost_calculation_items (supply_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger user_entitlements_set_updated_at before update on public.user_entitlements
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger ingredients_set_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();
create trigger user_ingredients_set_updated_at before update on public.user_ingredients
  for each row execute function public.set_updated_at();
create trigger household_measures_set_updated_at before update on public.household_measures
  for each row execute function public.set_updated_at();
create trigger tags_set_updated_at before update on public.tags
  for each row execute function public.set_updated_at();
create trigger standard_utensils_set_updated_at before update on public.standard_utensils
  for each row execute function public.set_updated_at();
create trigger event_references_set_updated_at before update on public.event_references
  for each row execute function public.set_updated_at();
create trigger supplies_set_updated_at before update on public.supplies
  for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
create trigger recipe_items_set_updated_at before update on public.recipe_items
  for each row execute function public.set_updated_at();
create trigger recipe_forgotten_set_updated_at before update on public.recipe_forgotten_ingredients
  for each row execute function public.set_updated_at();
create trigger menus_set_updated_at before update on public.menus
  for each row execute function public.set_updated_at();
create trigger menu_periods_set_updated_at before update on public.menu_periods
  for each row execute function public.set_updated_at();
create trigger menu_period_items_set_updated_at before update on public.menu_period_items
  for each row execute function public.set_updated_at();
create trigger event_plans_set_updated_at before update on public.event_plans
  for each row execute function public.set_updated_at();
create trigger shopping_lists_set_updated_at before update on public.shopping_lists
  for each row execute function public.set_updated_at();
create trigger shopping_list_items_set_updated_at before update on public.shopping_list_items
  for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();
create trigger cost_user_settings_set_updated_at before update on public.cost_user_settings
  for each row execute function public.set_updated_at();
create trigger cost_expenses_set_updated_at before update on public.cost_expenses
  for each row execute function public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'products',
    'plans',
    'user_entitlements',
    'payments',
    'ingredients',
    'user_ingredients',
    'household_measures',
    'ingredient_synonyms',
    'tags',
    'standard_utensils',
    'event_references',
    'supplies',
    'recipes',
    'recipe_items',
    'recipe_supplies',
    'recipe_tags',
    'recipe_forgotten_ingredients',
    'menus',
    'menu_recipes',
    'menu_supplies',
    'menu_tags',
    'menu_periods',
    'menu_period_items',
    'event_plans',
    'shopping_lists',
    'shopping_list_items',
    'cart_items',
    'cost_user_settings',
    'cost_expenses',
    'cost_calculations',
    'cost_calculation_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'revoke all on table public.%I from public, anon, authenticated, service_role',
      table_name
    );
  end loop;
end;
$$;

create policy profiles_owner_access
on public.profiles
for all
to authenticated
using (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy products_authenticated_read
on public.products
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy plans_authenticated_read
on public.plans
for select
to authenticated
using (
  (
    active
    and exists (
      select 1
      from public.products as product
      where product.id = plans.product_id
        and product.active
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy user_entitlements_owner_read
on public.user_entitlements
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy payments_owner_read
on public.payments
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy ingredients_authenticated_read
on public.ingredients
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy user_ingredients_owner_access
on public.user_ingredients
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    (select auth.uid()) = owner_id
    and (
      ingredient_id is null
      or exists (
        select 1
        from public.ingredients as ingredient
        where ingredient.id = user_ingredients.ingredient_id
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy household_measures_authenticated_read
on public.household_measures
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy ingredient_synonyms_authenticated_read
on public.ingredient_synonyms
for select
to authenticated
using (
  exists (
    select 1
    from public.ingredients as ingredient
    where ingredient.id = ingredient_synonyms.ingredient_id
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy tags_authenticated_read
on public.tags
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy standard_utensils_authenticated_read
on public.standard_utensils
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy event_references_authenticated_read
on public.event_references
for select
to authenticated
using (
  active
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy supplies_visible_read
on public.supplies
for select
to authenticated
using (
  is_base
  or (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy supplies_owner_write
on public.supplies
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  ((select auth.uid()) = owner_id and not is_base)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipes_visible_read
on public.recipes
for select
to authenticated
using (
  is_base
  or (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipes_owner_write
on public.recipes
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  ((select auth.uid()) = owner_id and not is_base)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_items_visible_read
on public.recipe_items
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_items.recipe_id
      and (recipe.is_base or recipe.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_items_owner_write
on public.recipe_items
for all
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_items.recipe_id
      and recipe.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.recipes as recipe
      where recipe.id = recipe_items.recipe_id
        and recipe.owner_id = (select auth.uid())
    )
    and (
      (
        item_type = 'ingredient'
        and exists (
          select 1
          from public.ingredients as ingredient
          where ingredient.id = recipe_items.ingredient_id
        )
      )
      or (
        item_type = 'user_ingredient'
        and exists (
          select 1
          from public.user_ingredients as user_ingredient
          where user_ingredient.id = recipe_items.user_ingredient_id
            and user_ingredient.owner_id = (select auth.uid())
        )
      )
      or (
        item_type = 'subrecipe'
        and exists (
          select 1
          from public.recipes as subrecipe
          where subrecipe.id = recipe_items.subrecipe_id
            and (subrecipe.is_base or subrecipe.owner_id = (select auth.uid()))
        )
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_supplies_visible_read
on public.recipe_supplies
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_supplies.recipe_id
      and (recipe.is_base or recipe.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_supplies_owner_write
on public.recipe_supplies
for all
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_supplies.recipe_id
      and recipe.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.recipes as recipe
      where recipe.id = recipe_supplies.recipe_id
        and recipe.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.supplies as supply
      where supply.id = recipe_supplies.supply_id
        and (supply.is_base or supply.owner_id = (select auth.uid()))
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_tags_visible_read
on public.recipe_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_tags.recipe_id
      and (recipe.is_base or recipe.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_tags_owner_write
on public.recipe_tags
for all
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_tags.recipe_id
      and recipe.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.recipes as recipe
      where recipe.id = recipe_tags.recipe_id
        and recipe.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tags as tag
      where tag.id = recipe_tags.tag_id
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_forgotten_visible_read
on public.recipe_forgotten_ingredients
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_forgotten_ingredients.recipe_id
      and (recipe.is_base or recipe.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy recipe_forgotten_owner_write
on public.recipe_forgotten_ingredients
for all
to authenticated
using (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_forgotten_ingredients.recipe_id
      and recipe.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_forgotten_ingredients.recipe_id
      and recipe.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menus_visible_read
on public.menus
for select
to authenticated
using (
  is_base
  or (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menus_owner_write
on public.menus
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  ((select auth.uid()) = owner_id and not is_base)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_recipes_visible_read
on public.menu_recipes
for select
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_recipes.menu_id
      and (menu.is_base or menu.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_recipes_owner_write
on public.menu_recipes
for all
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_recipes.menu_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.menus as menu
      where menu.id = menu_recipes.menu_id
        and menu.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.recipes as recipe
      where recipe.id = menu_recipes.recipe_id
        and (recipe.is_base or recipe.owner_id = (select auth.uid()))
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_supplies_visible_read
on public.menu_supplies
for select
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_supplies.menu_id
      and (menu.is_base or menu.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_supplies_owner_write
on public.menu_supplies
for all
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_supplies.menu_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.menus as menu
      where menu.id = menu_supplies.menu_id
        and menu.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.supplies as supply
      where supply.id = menu_supplies.supply_id
        and (supply.is_base or supply.owner_id = (select auth.uid()))
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_tags_visible_read
on public.menu_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_tags.menu_id
      and (menu.is_base or menu.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_tags_owner_write
on public.menu_tags
for all
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_tags.menu_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.menus as menu
      where menu.id = menu_tags.menu_id
        and menu.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tags as tag
      where tag.id = menu_tags.tag_id
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_periods_visible_read
on public.menu_periods
for select
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_periods.menu_id
      and (menu.is_base or menu.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_periods_owner_write
on public.menu_periods
for all
to authenticated
using (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_periods.menu_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  exists (
    select 1
    from public.menus as menu
    where menu.id = menu_periods.menu_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_period_items_visible_read
on public.menu_period_items
for select
to authenticated
using (
  exists (
    select 1
    from public.menu_periods as period
    join public.menus as menu on menu.id = period.menu_id
    where period.id = menu_period_items.menu_period_id
      and (menu.is_base or menu.owner_id = (select auth.uid()))
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy menu_period_items_owner_write
on public.menu_period_items
for all
to authenticated
using (
  exists (
    select 1
    from public.menu_periods as period
    join public.menus as menu on menu.id = period.menu_id
    where period.id = menu_period_items.menu_period_id
      and menu.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.menu_periods as period
      join public.menus as menu on menu.id = period.menu_id
      where period.id = menu_period_items.menu_period_id
        and menu.owner_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.recipes as recipe
      where recipe.id = menu_period_items.recipe_id
        and (recipe.is_base or recipe.owner_id = (select auth.uid()))
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy event_plans_owner_access
on public.event_plans
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    (select auth.uid()) = owner_id
    and (
      menu_id is null
      or exists (
        select 1
        from public.menus as menu
        where menu.id = event_plans.menu_id
          and (menu.is_base or menu.owner_id = (select auth.uid()))
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy shopping_lists_owner_access
on public.shopping_lists
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    (select auth.uid()) = owner_id
    and (
      event_plan_id is null
      or exists (
        select 1
        from public.event_plans as plan
        where plan.id = shopping_lists.event_plan_id
          and plan.owner_id = (select auth.uid())
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy shopping_list_items_owner_access
on public.shopping_list_items
for all
to authenticated
using (
  exists (
    select 1
    from public.shopping_lists as shopping_list
    where shopping_list.id = shopping_list_items.shopping_list_id
      and shopping_list.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    exists (
      select 1
      from public.shopping_lists as shopping_list
      where shopping_list.id = shopping_list_items.shopping_list_id
        and shopping_list.owner_id = (select auth.uid())
    )
    and (
      user_ingredient_id is null
      or exists (
        select 1
        from public.user_ingredients as user_ingredient
        where user_ingredient.id = shopping_list_items.user_ingredient_id
          and user_ingredient.owner_id = (select auth.uid())
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy cart_items_owner_access
on public.cart_items
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    (select auth.uid()) = owner_id
    and (
      (
        item_type = 'recipe'
        and exists (
          select 1
          from public.recipes as recipe
          where recipe.id = cart_items.recipe_id
            and (recipe.is_base or recipe.owner_id = (select auth.uid()))
        )
      )
      or (
        item_type = 'menu'
        and exists (
          select 1
          from public.menus as menu
          where menu.id = cart_items.menu_id
            and (menu.is_base or menu.owner_id = (select auth.uid()))
        )
      )
      or (
        item_type = 'supply'
        and exists (
          select 1
          from public.supplies as supply
          where supply.id = cart_items.supply_id
            and (supply.is_base or supply.owner_id = (select auth.uid()))
        )
      )
    )
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy cost_user_settings_owner_access
on public.cost_user_settings
for all
to authenticated
using (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.uid()) = user_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy cost_expenses_owner_access
on public.cost_expenses
for all
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy cost_calculations_owner_read
on public.cost_calculations
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy cost_calculation_items_owner_read
on public.cost_calculation_items
for select
to authenticated
using (
  exists (
    select 1
    from public.cost_calculations as calculation
    where calculation.id = cost_calculation_items.calculation_id
      and calculation.owner_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

grant usage on schema public to authenticated, service_role;

grant select, insert, update on public.profiles to authenticated;
grant select on
  public.products,
  public.plans,
  public.user_entitlements,
  public.payments,
  public.ingredients,
  public.household_measures,
  public.ingredient_synonyms,
  public.tags,
  public.standard_utensils,
  public.event_references,
  public.cost_calculations,
  public.cost_calculation_items
to authenticated;
grant select, insert, update, delete on
  public.user_ingredients,
  public.supplies,
  public.recipes,
  public.recipe_items,
  public.recipe_supplies,
  public.recipe_tags,
  public.recipe_forgotten_ingredients,
  public.menus,
  public.menu_recipes,
  public.menu_supplies,
  public.menu_tags,
  public.menu_periods,
  public.menu_period_items,
  public.event_plans,
  public.shopping_lists,
  public.shopping_list_items,
  public.cart_items,
  public.cost_expenses
to authenticated;
grant select, insert, update on public.cost_user_settings to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.products,
  public.plans,
  public.ingredients,
  public.user_ingredients,
  public.household_measures,
  public.ingredient_synonyms,
  public.tags,
  public.standard_utensils,
  public.event_references,
  public.supplies,
  public.recipes,
  public.recipe_items,
  public.recipe_supplies,
  public.recipe_tags,
  public.recipe_forgotten_ingredients,
  public.menus,
  public.menu_recipes,
  public.menu_supplies,
  public.menu_tags,
  public.menu_periods,
  public.menu_period_items,
  public.event_plans,
  public.shopping_lists,
  public.shopping_list_items,
  public.cart_items,
  public.cost_user_settings,
  public.cost_expenses
to service_role;
grant select, insert, update on
  public.user_entitlements,
  public.payments
to service_role;
grant select, insert on
  public.cost_calculations,
  public.cost_calculation_items
to service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

commit;
