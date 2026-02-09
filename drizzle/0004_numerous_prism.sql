ALTER TABLE `plant_images` ADD `bed_id` integer REFERENCES beds(id);--> statement-breakpoint
ALTER TABLE `plant_images` ADD `zone` text;--> statement-breakpoint
ALTER TABLE `plant_images` ADD `season_id` integer REFERENCES seasons(id);