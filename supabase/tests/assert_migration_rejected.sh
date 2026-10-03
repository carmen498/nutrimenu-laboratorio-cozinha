#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -ne 4 ]]; then
  echo "usage: $0 <migration-version> <fixture> <expected-message> <log-path>" >&2
  exit 64
fi

migration_version="$1"
fixture_path="$2"
expected_message="$3"
log_path="$4"

: "${NUTRIMENU_LOCAL_DB_URL:?NUTRIMENU_LOCAL_DB_URL must be set}"

supabase db reset --local --no-seed --version="$migration_version"
psql "$NUTRIMENU_LOCAL_DB_URL" --set=ON_ERROR_STOP=on --file "$fixture_path"

if supabase migration up --local >"$log_path" 2>&1; then
  echo "Expected migration rejection: $expected_message" >&2
  exit 1
fi

if ! grep --fixed-strings -- "$expected_message" "$log_path"; then
  sed -n '1,160p' "$log_path"
  exit 1
fi
