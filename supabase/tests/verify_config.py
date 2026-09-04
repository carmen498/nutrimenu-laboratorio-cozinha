from pathlib import Path
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

print("Supabase database-only configuration: PASS")
