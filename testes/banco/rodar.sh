#!/usr/bin/env bash
# Sobe um PostgreSQL temporário, aplica as migrations e roda o teste de RLS.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
if [ "$(id -u)" = 0 ]; then chown -R postgres "$TMP"; RUN="runuser -u postgres --"; else RUN=""; fi
$RUN "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null 2>&1
$RUN "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p 54329 -c listen_addresses=''" -w start >/dev/null
PSQL=(psql -h "$TMP" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$DIR/00_simular_supabase.sql"
for f in "$DIR"/../../supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$DIR/rls_test.sql" 2>&1 | sed 's/^psql:.*NOTICE:  //'
