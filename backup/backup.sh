#!/usr/bin/env bash
#
# Garden Planner backup script
# Backs up database and all images to /backup/ and copies to iCloud.
# Run from project root or from anywhere (script detects project root).
#

set -e

# Project root: parent of the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backup"
ICLOUD_DEST="/Users/server/Library/Mobile Documents/com~apple~CloudDocs/Server/Backups/GardenPlanner"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "=== Garden Planner Backup ==="
echo "Project: $PROJECT_ROOT"
echo "Backup to: $BACKUP_PATH"
echo ""

mkdir -p "$BACKUP_PATH/database"
mkdir -p "$BACKUP_PATH/static"

# 1. Database
if [ -f "$PROJECT_ROOT/database/garden.db" ]; then
  cp "$PROJECT_ROOT/database/garden.db" "$BACKUP_PATH/database/garden.db"
  echo "[OK] database/garden.db"
else
  echo "[SKIP] database/garden.db (not found)"
fi

# 2. Plant images (uploads + web)
if [ -d "$PROJECT_ROOT/static/plant-images" ]; then
  cp -R "$PROJECT_ROOT/static/plant-images" "$BACKUP_PATH/static/"
  COUNT=$(find "$BACKUP_PATH/static/plant-images" -type f 2>/dev/null | wc -l)
  echo "[OK] static/plant-images/ ($COUNT files)"
else
  echo "[SKIP] static/plant-images/ (not found)"
fi

# 3. Journal images
if [ -d "$PROJECT_ROOT/static/journal-images" ]; then
  cp -R "$PROJECT_ROOT/static/journal-images" "$BACKUP_PATH/static/"
  COUNT=$(find "$BACKUP_PATH/static/journal-images" -type f 2>/dev/null | wc -l)
  echo "[OK] static/journal-images/ ($COUNT files)"
else
  echo "[SKIP] static/journal-images/ (not found)"
fi

# Create tarball for easy restore
TARBALL="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
tar -czf "$TARBALL" -C "$BACKUP_DIR" "$BACKUP_NAME"
echo "[OK] Created $TARBALL"

# 4. Copy to iCloud (Server/Backups/GardenPlanner)
if [ -d "/Users/server/Library" ]; then
  mkdir -p "$ICLOUD_DEST"
  cp "$TARBALL" "$ICLOUD_DEST/"
  echo "[OK] Copied to $ICLOUD_DEST"
else
  echo "[SKIP] iCloud copy (path not found - not on server?)"
fi

# Prune old backups: keep 10 most recent
cd "$BACKUP_DIR"
ls -dt backup_* 2>/dev/null | tail -n +11 | while read -r old; do
  if [ -d "$old" ]; then
    rm -rf "$old"
    echo "[PRUNE] Removed $old"
  fi
done
ls -t backup_*.tar.gz 2>/dev/null | tail -n +11 | while read -r old; do
  rm -f "$old"
  echo "[PRUNE] Removed $old"
done

echo ""
echo "=== Backup complete ==="
echo "Archive: $TARBALL"
