#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd)"
compose_file="$project_root/compose.yaml"
compose_project="nutrigo"
database_volume="${compose_project}_nutrigo-pgdata"
seed_file="$script_dir/seed-dev-db.sql"

if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose=(docker-compose)
else
  echo "Docker Compose is required (docker compose or docker-compose)." >&2
  exit 1
fi

if [[ "${1:-}" != "--yes" ]]; then
  if [[ ! -t 0 ]]; then
    echo "Refusing to reset the database non-interactively. Re-run with --yes." >&2
    exit 1
  fi

  printf 'This will permanently delete the %s Docker volume. Continue? [y/N] ' "$database_volume"
  read -r answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Database reset cancelled."
    exit 0
  fi
fi

"${compose[@]}" -p "$compose_project" -f "$compose_file" down --remove-orphans
docker volume rm "$database_volume" >/dev/null 2>&1 || true
"${compose[@]}" -p "$compose_project" -f "$compose_file" up -d --build

database_ready=false
for attempt in {1..30}; do
  if "${compose[@]}" -p "$compose_project" -f "$compose_file" exec -T db \
    pg_isready -U nutrigo -d nutrigo >/dev/null 2>&1; then
    database_ready=true
    break
  fi

  sleep 1
done

if [[ "$database_ready" != true ]]; then
  echo "Database did not become ready within 30 seconds." >&2
  exit 1
fi

"${compose[@]}" -p "$compose_project" -f "$compose_file" exec -T db \
  psql -v ON_ERROR_STOP=1 -U nutrigo -d nutrigo < "$seed_file"

echo "Database reset and development seed complete."
