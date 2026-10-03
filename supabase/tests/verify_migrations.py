from pathlib import Path
import re


supabase_path = Path(__file__).parents[1]
migrations_path = supabase_path / "migrations"
migration_names = sorted(path.name for path in migrations_path.glob("*.sql"))
reconciliation_chain = [
    "20260904194502_remote_schema.sql",
    "20260904200528_preserve_legacy_profiles.sql",
    "20260904200530_bootstrap_migration_landing_after_remote.sql",
    "20260904200532_operational_schema_and_rls_after_remote.sql",
    "20260904200534_reconcile_legacy_profiles.sql",
]

assert all(name in migration_names for name in reconciliation_chain)
assert [migration_names.index(name) for name in reconciliation_chain] == sorted(
    migration_names.index(name) for name in reconciliation_chain
), "remote baseline and reconciliation migrations must remain ordered"
assert "20260904124429_bootstrap_migration_landing.sql" not in migration_names
assert "20260904141551_operational_schema_and_rls.sql" not in migration_names

remote_baseline = (migrations_path / reconciliation_chain[0]).read_text(
    encoding="utf-8"
)
assert not re.search(
    r"\b(insert\s+into|merge\s+into|copy\s+[^\s]+\s+from)\b",
    remote_baseline,
    flags=re.IGNORECASE,
), "the remote baseline must contain schema only"

preservation_migration = (migrations_path / reconciliation_chain[1]).read_text(
    encoding="utf-8"
)
assert "public.profiles rename to profiles_legacy" in preservation_migration
assert "public.profiles_legacy set schema labcozinha" in preservation_migration
assert "revoke execute on function public.rls_auto_enable()" in preservation_migration

operational_migration = (migrations_path / reconciliation_chain[3]).read_text(
    encoding="utf-8"
)
assert not re.search(
    r"\b(insert\s+into|merge\s+into|copy\s+public\.)\b",
    operational_migration,
    flags=re.IGNORECASE,
), "the operational schema migration must not import data"
assert not re.search(
    r"\bfor\s+all\b",
    operational_migration,
    flags=re.IGNORECASE,
), "RLS policies must be explicit per operation"
assert "private.protect_legacy_id" in operational_migration
assert "hourly_labor_cost_cents" not in operational_migration
for feature_flag in (
    "costs_module_enabled",
    "costs_trial_enabled",
    "costs_sales_enabled",
    "costs_checkout_enabled",
):
    assert feature_flag in operational_migration

seed_path = supabase_path / "seed.sql"
seed_statements = [
    line
    for line in seed_path.read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.lstrip().startswith("--")
]
assert not seed_statements, "seed.sql must remain empty until data import is reviewed"

print("Supabase migration sources: PASS")
