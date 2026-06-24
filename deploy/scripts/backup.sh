#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CarDost — backup MongoDB + uploaded files
#
# Usage:    /opt/cardost/deploy/scripts/backup.sh
# Cron:     0 3 * * *  /opt/cardost/deploy/scripts/backup.sh  >> /var/log/cardost/backup.log 2>&1
#
# Output:   /var/backups/cardost/cardost-YYYY-MM-DD_HHMM.tar.gz
# Retention: keeps last 14 backups by default (override with RETENTION env)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/cardost}"
RETENTION="${RETENTION:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/cardost/deploy/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-/opt/cardost/deploy/.env.backend}"
STAMP="$(date +%Y-%m-%d_%H%M)"
WORK="$(mktemp -d)"
ARCHIVE="$BACKUP_DIR/cardost-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"
echo "[$(date -Iseconds)] starting backup → $ARCHIVE"

# ── 1) MongoDB dump ──
echo "  → mongodump"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T mongo \
    sh -c 'mongodump --archive --gzip --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
    > "$WORK/mongo.archive.gz"

# ── 2) Config snapshot (.env + nginx site) ──
echo "  → config snapshot"
mkdir -p "$WORK/config"
cp "$ENV_FILE" "$WORK/config/.env.backend" 2>/dev/null || true
cp /opt/cardost/deploy/.env.frontend "$WORK/config/.env.frontend" 2>/dev/null || true
cp /etc/nginx/sites-available/cardost.conf "$WORK/config/nginx.cardost.conf" 2>/dev/null || true

# ── 3) Tar it up ──
echo "  → packaging"
tar -czf "$ARCHIVE" -C "$WORK" mongo.archive.gz config
chmod 600 "$ARCHIVE"
rm -rf "$WORK"

# ── 4) Prune old ──
echo "  → pruning (retention=$RETENTION)"
ls -1t "$BACKUP_DIR"/cardost-*.tar.gz 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -f

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "[$(date -Iseconds)] backup OK → $ARCHIVE ($SIZE)"
