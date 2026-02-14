# Garden Planner Backups

## Run backup (on server or locally)

```bash
# From project root
./backup/backup.sh

# Or from anywhere
/path/to/gardenPlanner/backup/backup.sh
```

## What gets backed up

- `database/garden.db` — SQLite database (plants, beds, seasons, journal, etc.)
- `static/plant-images/` — Plant photos (uploads + web)
- `static/journal-images/` — Journal entry photos

## Backup locations

1. **Project** — `backup/backup_YYYY-MM-DD_HHMMSS/` and `backup/backup_YYYY-MM-DD_HHMMSS.tar.gz`
2. **iCloud** — `/Users/server/Library/Mobile Documents/com~apple~CloudDocs/Server/Backups/GardenPlanner/`

Keeps the 10 most recent backups; older ones are pruned automatically.

## Restore from backup

```bash
# 1. Stop the app if it's running

# 2. Extract the tarball (creates backup_YYYY-MM-DD_HHMMSS/ in current dir)
cd /path/to/gardenPlanner
tar -xzf backup/backup_YYYY-MM-DD_HHMMSS.tar.gz

# 3. Replace database and image directories
cp backup_YYYY-MM-DD_HHMMSS/database/garden.db database/
rm -rf static/plant-images static/journal-images
cp -R backup_YYYY-MM-DD_HHMMSS/static/plant-images backup_YYYY-MM-DD_HHMMSS/static/journal-images static/

# 4. Remove extracted folder, restart the app
rm -rf backup_YYYY-MM-DD_HHMMSS
```
