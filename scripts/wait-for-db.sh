#!/bin/bash
set -e

host="${DATABASE_HOST:-localhost}"
port="${DATABASE_PORT:-5432}"
user="${DATABASE_USER:-postgres}"
timeout="${DB_WAIT_TIMEOUT:-60}"

echo "⏳ Waiting for database at $host:$port..."

for i in $(seq 1 $timeout); do
  if docker exec visionary-app-db-1 pg_isready -U "$user" >/dev/null 2>&1; then
    echo "✅ Database is ready!"
    exit 0
  fi
  sleep 1
done

echo "❌ Timeout waiting for database at $host:$port"
exit 1
