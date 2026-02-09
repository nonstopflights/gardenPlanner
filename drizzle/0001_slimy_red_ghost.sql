CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`entry_date` text NOT NULL,
	`tags` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `plant_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plant_id` integer NOT NULL,
	`season_id` integer,
	`activity_type` text NOT NULL,
	`description` text,
	`activity_date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bed_plants` ADD `season_id` integer REFERENCES seasons(id);--> statement-breakpoint
ALTER TABLE `plant_images` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `plant_images` ADD `taken_at` text;--> statement-breakpoint
ALTER TABLE `plants` ADD `seed_source` text;--> statement-breakpoint
ALTER TABLE `plants` ADD `seed_source_url` text;--> statement-breakpoint
ALTER TABLE `plants` ADD `seed_cost` real;