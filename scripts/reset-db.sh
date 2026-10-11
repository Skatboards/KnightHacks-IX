#!/usr/bin/env bash

set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$project_root/compose.yaml"
compose_project="nutrigo"
database_volume="${compose_project}_nutrigo-pgdata"

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

echo "Database reset complete. The migration will run against the new volume."
