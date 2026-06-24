#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CarDost — restore a backup archive
#
# Usage:    sudo bash deploy/scripts/restore.sh /path/to/cardost-YYYY-MM-DD_HHMM.tar.gz
#
# This DROPS the existing database before restoring. Confirmation required.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ARCHIVE="${1:?usage: restore.sh /path/to/cardost-YYYY-MM-DD_HHMM.tar.gz}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/cardost/deploy/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-/opt/cardost/deploy/.env.backend}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "ERROR: archive not found: $ARCHIVE" >&2; exit 1
fi

echo
echo "⚠️  This will DROP the current database and replace it with $ARCHIVE"
read -rp "Type RESTORE to continue: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "→ Extracting"
tar -xzf "$ARCHIVE" -C "$WORK"

echo "→ Restoring MongoDB (with --drop)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T mongo \
    sh -c 'mongorestore --archive --gzip --drop --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
    < "$WORK/mongo.archive.gz"

echo
echo "✅ Restore complete from $ARCHIVE"
echo "   Restart backend if anything looks stuck:"
echo "     docker compose -f $COMPOSE_FILE restart backend"
