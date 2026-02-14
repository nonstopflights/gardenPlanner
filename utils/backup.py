#!/usr/bin/env python3
"""Backup garden planner database and images to iCloud Drive."""

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
ICLOUD_BACKUP_DIR = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/GardenPlannerBackups"

DB_PATH = PROJECT_DIR / "database" / "garden.db"
IMAGE_DIRS = [
    PROJECT_DIR / "static" / "plant-images" / "uploads",
    PROJECT_DIR / "static" / "journal-images" / "uploads",
]


def backup():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    dest = ICLOUD_BACKUP_DIR / timestamp
    dest.mkdir(parents=True, exist_ok=True)

    # Backup database using SQLite online backup API (safe even if db is in use)
    if DB_PATH.exists():
        db_dest = dest / "garden.db"
        src = sqlite3.connect(str(DB_PATH))
        dst = sqlite3.connect(str(db_dest))
        src.backup(dst)
        dst.close()
        src.close()
        print(f"Database backed up to {db_dest}")
    else:
        print(f"Warning: database not found at {DB_PATH}")

    # Backup image directories
    for img_dir in IMAGE_DIRS:
        if img_dir.exists():
            rel = img_dir.relative_to(PROJECT_DIR / "static")
            img_dest = dest / rel
            shutil.copytree(img_dir, img_dest)
            count = sum(1 for _ in img_dest.rglob("*") if _.is_file())
            print(f"Copied {count} files from {rel}")
        else:
            print(f"Skipping {img_dir} (does not exist)")

    # Prune old backups — keep the 10 most recent
    all_backups = sorted(
        [d for d in ICLOUD_BACKUP_DIR.iterdir() if d.is_dir()],
        key=lambda d: d.name,
        reverse=True,
    )
    for old in all_backups[10:]:
        shutil.rmtree(old)
        print(f"Pruned old backup: {old.name}")

    print(f"Backup complete: {dest}")


if __name__ == "__main__":
    backup()
