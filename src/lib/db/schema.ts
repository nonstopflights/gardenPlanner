import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// --- Seasons ---

export const seasons = sqliteTable('seasons', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(), // e.g. "Spring 2025"
	year: integer('year').notNull(),
	type: text('type').notNull(), // 'spring' | 'summer' | 'fall' | 'winter' | 'full-year'
	startDate: text('start_date'),
	endDate: text('end_date'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// --- Plants ---

export const plants = sqliteTable('plants', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	variety: text('variety'),
	category: text('category').notNull(), // 'past', 'want', 'current'
	plantingDate: text('planting_date'),
	harvestDate: text('harvest_date'),
	spacing: text('spacing'),
	sunRequirements: text('sun_requirements'),
	waterNeeds: text('water_needs'),
	companionPlants: text('companion_plants'), // JSON array or comma-separated
	matureHeight: text('mature_height'), // e.g. "4-6 feet", "12 inches"
	daysToMaturity: integer('days_to_maturity'),
	growingNotes: text('growing_notes'),
	harvestingNotes: text('harvesting_notes'),
	seedSource: text('seed_source'),
	seedSourceUrl: text('seed_source_url'),
	seedCost: real('seed_cost'),
	plantingSeason: text('planting_season'), // 'spring' | 'fall' | 'both'
	startIndoorsWeeks: integer('start_indoors_weeks'), // weeks before last frost
	transplantWeeks: integer('transplant_weeks'), // weeks after last frost (negative = before)
	directSowWeeks: integer('direct_sow_weeks'), // weeks after last frost (negative = before)
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// --- Beds ---

export const beds = sqliteTable('beds', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	width: real('width').notNull().default(4),
	height: real('height').notNull().default(8),
	cornerRadius: real('corner_radius').notNull().default(0.5)
});

export const bedPlants = sqliteTable('bed_plants', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bedId: integer('bed_id').notNull().references(() => beds.id, { onDelete: 'cascade' }),
	plantId: integer('plant_id').notNull().references(() => plants.id, { onDelete: 'cascade' }),
	seasonId: integer('season_id').references(() => seasons.id, { onDelete: 'set null' }),
	zone: text('zone').notNull().default('custom'),
	posX: real('pos_x').notNull().default(50),
	posY: real('pos_y').notNull().default(50),
	plantedDate: text('planted_date'),
	notes: text('notes')
});

// --- Plant Images ---

export const plantImages = sqliteTable('plant_images', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	plantId: integer('plant_id').notNull().references(() => plants.id, { onDelete: 'cascade' }),
	imagePath: text('image_path').notNull(),
	isWebImage: integer('is_web_image', { mode: 'boolean' }).notNull().default(false),
	sourceUrl: text('source_url'),
	caption: text('caption'),
	takenAt: text('taken_at'),
	bedId: integer('bed_id').references(() => beds.id, { onDelete: 'set null' }),
	zone: text('zone'),
	seasonId: integer('season_id').references(() => seasons.id, { onDelete: 'set null' }),
	uploadedAt: text('uploaded_at').notNull().$defaultFn(() => new Date().toISOString())
});

// --- Plant Web Info ---

export const plantWebInfo = sqliteTable('plant_web_info', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	plantId: integer('plant_id').notNull().references(() => plants.id, { onDelete: 'cascade' }),
	searchQuery: text('search_query').notNull(),
	infoJson: text('info_json').notNull(), // JSON blob
	sourceUrl: text('source_url'),
	searchedAt: text('searched_at').notNull().$defaultFn(() => new Date().toISOString())
});

// --- Journal ---

export const journalEntries = sqliteTable('journal_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	seasonId: integer('season_id').references(() => seasons.id, { onDelete: 'set null' }),
	title: text('title').notNull(),
	content: text('content').notNull(), // Markdown content
	entryDate: text('entry_date').notNull(),
	tags: text('tags'), // JSON array stored as text
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// --- Journal Images ---

export const journalImages = sqliteTable('journal_images', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	journalEntryId: integer('journal_entry_id')
		.notNull()
		.references(() => journalEntries.id, { onDelete: 'cascade' }),
	imagePath: text('image_path').notNull(),
	caption: text('caption'),
	bedId: integer('bed_id').references(() => beds.id, { onDelete: 'set null' }),
	zone: text('zone'),
	uploadedAt: text('uploaded_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// --- Plant Activities ---

export const plantActivities = sqliteTable('plant_activities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	plantId: integer('plant_id').notNull().references(() => plants.id, { onDelete: 'cascade' }),
	seasonId: integer('season_id').references(() => seasons.id, { onDelete: 'set null' }),
	activityType: text('activity_type').notNull(), // 'planted'|'watered'|'fertilized'|'harvested'|'pruned'|'note'
	sourceType: text('source_type'), // 'seed' | 'transplant' (only for 'planted' activities)
	description: text('description'),
	activityDate: text('activity_date').notNull(),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
});
