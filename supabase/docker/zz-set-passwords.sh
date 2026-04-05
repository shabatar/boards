#!/bin/bash
# Set passwords for Supabase service roles using the same password as POSTGRES_PASSWORD.
# Runs after the image's own init scripts (sorted by filename).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  ALTER USER supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER USER authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER USER supabase_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL
