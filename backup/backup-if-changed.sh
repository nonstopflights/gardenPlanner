#!/usr/bin/env bash
#
# Only backs up if database or images have changed since last run.
# Used by the launchd plist for periodic backup-on-change.
#

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$PROJECT_ROOT/backup/.last-backup-state"
SCRIPT="$PROJECT_ROOT/backup/backup.sh"

# Compute hash of modification times for database + image dirs
# (changes when any file is added, modified, or removed)
current_hash=$(find "$PROJECT_ROOT/database/garden.db" \
  "$PROJECT_ROOT/static/plant-images" \
  "$PROJECT_ROOT/static/journal-images" \
  -type f 2>/dev/null | xargs stat -f "%m %N" 2>/dev/null | md5 2>/dev/null || echo "unknown")

# Compare to last run
if [ -f "$STATE_FILE" ]; then
  last_hash=$(cat "$STATE_FILE")
  if [ "$current_hash" = "$last_hash" ] && [ -n "$current_hash" ]; then
    exit 0
  fi
fi

# Changes detected — run backup
"$SCRIPT"
echo "$current_hash" > "$STATE_FILE"
