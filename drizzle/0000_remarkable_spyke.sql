CREATE TABLE `bed_plants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bed_id` integer NOT NULL,
	`plant_id` integer NOT NULL,
	`zone` text NOT NULL,
	`planted_date` text,
	`notes` text,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `beds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`width` real DEFAULT 4 NOT NULL,
	`height` real DEFAULT 8 NOT NULL,
	`corner_radius` real DEFAULT 0.5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plant_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plant_id` integer NOT NULL,
	`image_path` text NOT NULL,
	`is_web_image` integer DEFAULT false NOT NULL,
	`source_url` text,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plant_web_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plant_id` integer NOT NULL,
	`search_query` text NOT NULL,
	`info_json` text NOT NULL,
	`source_url` text,
	`searched_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`variety` text,
	`category` text NOT NULL,
	`planting_date` text,
	`harvest_date` text,
	`spacing` text,
	`sun_requirements` text,
	`water_needs` text,
	`companion_plants` text,
	`days_to_maturity` integer,
	`growing_notes` text,
	`harvesting_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
