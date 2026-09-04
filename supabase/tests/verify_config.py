from pathlib import Path
import re
import tomllib


config_path = Path(__file__).parents[1] / "config.toml"
with config_path.open("rb") as config_file:
    config = tomllib.load(config_file)

assert config["api"]["auto_expose_new_tables"] is False
assert "labcozinha_migration" not in config["api"]["schemas"]

database_only_services = (
    "api",
    "realtime",
    "studio",
    "local_smtp",
    "storage",
    "auth",
    "edge_runtime",
    "analytics",
)
for service in database_only_services:
    assert config[service]["enabled"] is False, f"{service} must remain disabled"

assert config["storage"]["s3_protocol"]["enabled"] is False
assert config["storage"]["analytics"]["enabled"] is False
assert config["storage"]["vector"]["enabled"] is False

operational_migration_path = (
    config_path.parent
    / "migrations"
    / "20260904141551_operational_schema_and_rls.sql"
)
operational_migration = operational_migration_path.read_text(encoding="utf-8")
assert not re.search(
    r"\b(insert\s+into|merge\s+into|copy\s+public\.)\b",
    operational_migration,
    flags=re.IGNORECASE,
), "the operational schema migration must not import data"

seed_path = config_path.parent / "seed.sql"
seed_statements = [
    line
    for line in seed_path.read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.lstrip().startswith("--")
]
assert not seed_statements, "seed.sql must remain empty until data import is reviewed"

print("Supabase database-only schema configuration: PASS")
