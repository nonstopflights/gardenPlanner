PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bed_plants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bed_id` integer NOT NULL,
	`plant_id` integer NOT NULL,
	`season_id` integer,
	`zone` text DEFAULT 'custom' NOT NULL,
	`pos_x` real DEFAULT 50 NOT NULL,
	`pos_y` real DEFAULT 50 NOT NULL,
	`planted_date` text,
	`notes` text,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_bed_plants`("id", "bed_id", "plant_id", "season_id", "zone", "pos_x", "pos_y", "planted_date", "notes") SELECT "id", "bed_id", "plant_id", "season_id", "zone", 50, 50, "planted_date", "notes" FROM `bed_plants`;--> statement-breakpoint
DROP TABLE `bed_plants`;--> statement-breakpoint
ALTER TABLE `__new_bed_plants` RENAME TO `bed_plants`;--> statement-breakpoint
PRAGMA foreign_keys=ON;