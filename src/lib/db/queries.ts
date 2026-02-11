import { db } from './client';
import { eq, and, desc, inArray, like } from 'drizzle-orm';
import {
	plants,
	beds,
	bedPlants,
	plantImages,
	plantWebInfo,
	seasons,
	journalEntries,
	journalImages,
	plantActivities
} from './schema';

// --- Types ---

export type Plant = typeof plants.$inferSelect;
export type Bed = typeof beds.$inferSelect;
export type BedPlant = typeof bedPlants.$inferSelect;
export type PlantImage = typeof plantImages.$inferSelect;
export type PlantWebInfo = typeof plantWebInfo.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalImage = typeof journalImages.$inferSelect;
export type PlantActivity = typeof plantActivities.$inferSelect;

// --- Plant queries ---

export async function getAllPlants(category?: 'past' | 'want' | 'current') {
	if (category) {
		return db
			.select()
			.from(plants)
			.where(eq(plants.category, category))
			.orderBy(desc(plants.createdAt));
	}
	return db.select().from(plants).orderBy(desc(plants.createdAt));
}

export async function getPlantById(id: number) {
	const result = await db.select().from(plants).where(eq(plants.id, id)).limit(1);
	return result[0] || null;
}

export async function createPlant(data: typeof plants.$inferInsert) {
	const result = await db.insert(plants).values(data).returning();
	return result[0];
}

export async function updatePlant(id: number, data: Partial<typeof plants.$inferInsert>) {
	const result = await db
		.update(plants)
		.set({ ...data, updatedAt: new Date().toISOString() })
		.where(eq(plants.id, id))
		.returning();
	return result[0] || null;
}

export async function deletePlant(id: number) {
	await db.delete(plants).where(eq(plants.id, id));
}

// --- Bed queries ---

export async function getAllBeds() {
	return db.select().from(beds).orderBy(beds.id);
}

export async function getBedById(id: number) {
	const result = await db.select().from(beds).where(eq(beds.id, id)).limit(1);
	return result[0] || null;
}

export async function getBedWithPlants(bedId: number, seasonId?: number) {
	const bed = await getBedById(bedId);
	if (!bed) return null;

	const conditions = [eq(bedPlants.bedId, bedId)];
	if (seasonId) {
		conditions.push(eq(bedPlants.seasonId, seasonId));
	}

	const bedPlantRecords = await db
		.select()
		.from(bedPlants)
		.where(conditions.length > 1 ? and(...conditions) : conditions[0]);

	const plantIds = bedPlantRecords.map((bp) => bp.plantId);
	const plantList =
		plantIds.length > 0
			? await db.select().from(plants).where(inArray(plants.id, plantIds))
			: [];

	return {
		...bed,
		plants: bedPlantRecords.map((bp) => {
			const plant = plantList.find((p) => p.id === bp.plantId);
			return { ...bp, plant };
		})
	};
}

// --- Bed-Plant relationship queries ---

export async function addPlantToBed(
	bedId: number,
	plantId: number,
	zone: string = 'custom',
	seasonId?: number,
	plantedDate?: string,
	posX: number = 50,
	posY: number = 50
) {
	const result = await db
		.insert(bedPlants)
		.values({
			bedId,
			plantId,
			zone,
			seasonId: seasonId || null,
			plantedDate: plantedDate || new Date().toISOString().split('T')[0],
			posX,
			posY
		})
		.returning();
	return result[0];
}

export async function removePlantFromBed(bedId: number, plantId: number, zone: string) {
	await db
		.delete(bedPlants)
		.where(
			and(eq(bedPlants.bedId, bedId), eq(bedPlants.plantId, plantId), eq(bedPlants.zone, zone))
		);
}

export async function removeBedPlant(id: number) {
	await db.delete(bedPlants).where(eq(bedPlants.id, id));
}

export async function updateBedPlantPosition(id: number, posX: number, posY: number) {
	const result = await db
		.update(bedPlants)
		.set({ posX, posY })
		.where(eq(bedPlants.id, id))
		.returning();
	return result[0] || null;
}

export async function getPlantsInBed(bedId: number, seasonId?: number) {
	const conditions = [eq(bedPlants.bedId, bedId)];
	if (seasonId) {
		conditions.push(eq(bedPlants.seasonId, seasonId));
	}
	return db
		.select()
		.from(bedPlants)
		.where(conditions.length > 1 ? and(...conditions) : conditions[0]);
}

export async function copyBedLayoutsToSeason(fromSeasonId: number, toSeasonId: number) {
	const existing = await db
		.select()
		.from(bedPlants)
		.where(eq(bedPlants.seasonId, fromSeasonId));

	if (existing.length > 0) {
		const newRecords = existing.map((bp) => ({
			bedId: bp.bedId,
			plantId: bp.plantId,
			zone: bp.zone,
			seasonId: toSeasonId,
			plantedDate: null as string | null,
			notes: bp.notes,
			posX: bp.posX,
			posY: bp.posY
		}));
		await db.insert(bedPlants).values(newRecords);
	}
	return existing.length;
}

// --- Image queries ---

export async function getAllPlantFirstImages(): Promise<Record<number, string>> {
	const allImages = await db.select().from(plantImages).orderBy(plantImages.uploadedAt);
	const imageMap: Record<number, string> = {};
	for (const img of allImages) {
		if (!imageMap[img.plantId]) {
			imageMap[img.plantId] = img.imagePath;
		}
	}
	return imageMap;
}

export async function getPlantImages(plantId: number) {
	return db
		.select()
		.from(plantImages)
		.where(eq(plantImages.plantId, plantId))
		.orderBy(plantImages.takenAt, desc(plantImages.uploadedAt));
}

export async function addPlantImage(data: typeof plantImages.$inferInsert) {
	const result = await db.insert(plantImages).values(data).returning();
	return result[0];
}

export async function updatePlantImage(
	id: number,
	data: {
		caption?: string;
		takenAt?: string;
		bedId?: number | null;
		zone?: string | null;
		seasonId?: number | null;
	}
) {
	const result = await db
		.update(plantImages)
		.set(data)
		.where(eq(plantImages.id, id))
		.returning();
	return result[0] || null;
}

export async function deletePlantImage(id: number) {
	await db.delete(plantImages).where(eq(plantImages.id, id));
}

export async function getPlantImagesForSpot(
	plantId: number,
	bedId: number,
	zone: string,
	seasonId: number
) {
	const conditions = [
		eq(plantImages.plantId, plantId),
		eq(plantImages.bedId, bedId),
		eq(plantImages.seasonId, seasonId)
	];
	// For free-positioned plants (zone='custom'), skip zone filter
	if (zone !== 'custom') {
		conditions.push(eq(plantImages.zone, zone));
	}
	return db
		.select()
		.from(plantImages)
		.where(and(...conditions))
		.orderBy(desc(plantImages.takenAt), desc(plantImages.uploadedAt));
}

// --- Web info queries ---

export async function getPlantWebInfo(plantId: number) {
	const result = await db
		.select()
		.from(plantWebInfo)
		.where(eq(plantWebInfo.plantId, plantId))
		.limit(1);
	return result[0] || null;
}

export async function savePlantWebInfo(data: typeof plantWebInfo.$inferInsert) {
	const result = await db.insert(plantWebInfo).values(data).returning();
	return result[0];
}

// --- Season queries ---

export async function getAllSeasons() {
	return db.select().from(seasons).orderBy(desc(seasons.year), desc(seasons.createdAt));
}

export async function getActiveSeason() {
	const result = await db
		.select()
		.from(seasons)
		.where(eq(seasons.isActive, true))
		.limit(1);
	return result[0] || null;
}

export async function getSeasonById(id: number) {
	const result = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
	return result[0] || null;
}

export async function createSeason(data: typeof seasons.$inferInsert) {
	const result = await db.insert(seasons).values(data).returning();
	return result[0];
}

export async function setActiveSeason(id: number) {
	await db.update(seasons).set({ isActive: false });
	const result = await db
		.update(seasons)
		.set({ isActive: true, updatedAt: new Date().toISOString() })
		.where(eq(seasons.id, id))
		.returning();
	return result[0] || null;
}

export async function updateSeason(id: number, data: Partial<typeof seasons.$inferInsert>) {
	const result = await db
		.update(seasons)
		.set({ ...data, updatedAt: new Date().toISOString() })
		.where(eq(seasons.id, id))
		.returning();
	return result[0] || null;
}

// --- Journal queries ---

export async function getAllJournalEntries(seasonId?: number) {
	if (seasonId) {
		return db
			.select()
			.from(journalEntries)
			.where(eq(journalEntries.seasonId, seasonId))
			.orderBy(desc(journalEntries.entryDate));
	}
	return db.select().from(journalEntries).orderBy(desc(journalEntries.entryDate));
}

export async function getJournalEntryById(id: number) {
	const result = await db
		.select()
		.from(journalEntries)
		.where(eq(journalEntries.id, id))
		.limit(1);
	return result[0] || null;
}

export async function createJournalEntry(data: typeof journalEntries.$inferInsert) {
	const result = await db.insert(journalEntries).values(data).returning();
	return result[0];
}

export async function updateJournalEntry(
	id: number,
	data: Partial<typeof journalEntries.$inferInsert>
) {
	const result = await db
		.update(journalEntries)
		.set({ ...data, updatedAt: new Date().toISOString() })
		.where(eq(journalEntries.id, id))
		.returning();
	return result[0] || null;
}

export async function deleteJournalEntry(id: number) {
	await db.delete(journalEntries).where(eq(journalEntries.id, id));
}

export async function searchJournalEntries(query: string, seasonId?: number) {
	const conditions = [like(journalEntries.content, `%${query}%`)];
	if (seasonId) {
		conditions.push(eq(journalEntries.seasonId, seasonId));
	}
	return db
		.select()
		.from(journalEntries)
		.where(conditions.length > 1 ? and(...conditions) : conditions[0])
		.orderBy(desc(journalEntries.entryDate));
}

export async function getRecentJournalEntries(limit: number = 5, seasonId?: number) {
	if (seasonId) {
		return db
			.select()
			.from(journalEntries)
			.where(eq(journalEntries.seasonId, seasonId))
			.orderBy(desc(journalEntries.entryDate))
			.limit(limit);
	}
	return db
		.select()
		.from(journalEntries)
		.orderBy(desc(journalEntries.entryDate))
		.limit(limit);
}

// --- Journal image queries ---

export async function getJournalImages(journalEntryId: number) {
	return db
		.select()
		.from(journalImages)
		.where(eq(journalImages.journalEntryId, journalEntryId))
		.orderBy(journalImages.uploadedAt);
}

export async function getJournalImagesForEntries(entryIds: number[]) {
	if (entryIds.length === 0) return [];
	return db
		.select()
		.from(journalImages)
		.where(inArray(journalImages.journalEntryId, entryIds))
		.orderBy(journalImages.uploadedAt);
}

export async function addJournalImage(data: typeof journalImages.$inferInsert) {
	const result = await db.insert(journalImages).values(data).returning();
	return result[0];
}

export async function updateJournalImage(
	id: number,
	data: { caption?: string; bedId?: number | null; zone?: string | null }
) {
	const result = await db
		.update(journalImages)
		.set(data)
		.where(eq(journalImages.id, id))
		.returning();
	return result[0] || null;
}

export async function deleteJournalImage(id: number) {
	await db.delete(journalImages).where(eq(journalImages.id, id));
}

// --- Plant activity queries ---

export async function getPlantActivities(plantId: number, seasonId?: number) {
	const conditions = [eq(plantActivities.plantId, plantId)];
	if (seasonId) {
		conditions.push(eq(plantActivities.seasonId, seasonId));
	}
	return db
		.select()
		.from(plantActivities)
		.where(conditions.length > 1 ? and(...conditions) : conditions[0])
		.orderBy(desc(plantActivities.activityDate));
}

export async function createPlantActivity(data: typeof plantActivities.$inferInsert) {
	const result = await db.insert(plantActivities).values(data).returning();
	return result[0];
}

export async function deletePlantActivity(id: number) {
	await db.delete(plantActivities).where(eq(plantActivities.id, id));
}

export async function getAllPlantingActivities(seasonId?: number) {
	const conditions = [eq(plantActivities.activityType, 'planted')];
	if (seasonId) {
		conditions.push(eq(plantActivities.seasonId, seasonId));
	}
	const activities = await db
		.select({
			id: plantActivities.id,
			plantId: plantActivities.plantId,
			plantName: plants.name,
			plantVariety: plants.variety,
			seasonId: plantActivities.seasonId,
			activityType: plantActivities.activityType,
			sourceType: plantActivities.sourceType,
			description: plantActivities.description,
			activityDate: plantActivities.activityDate,
			createdAt: plantActivities.createdAt
		})
		.from(plantActivities)
		.innerJoin(plants, eq(plantActivities.plantId, plants.id))
		.where(conditions.length > 1 ? and(...conditions) : conditions[0])
		.orderBy(desc(plantActivities.activityDate));
	return activities;
}

export async function getRecentActivities(limit: number = 10, seasonId?: number) {
	if (seasonId) {
		return db
			.select()
			.from(plantActivities)
			.where(eq(plantActivities.seasonId, seasonId))
			.orderBy(desc(plantActivities.activityDate))
			.limit(limit);
	}
	return db
		.select()
		.from(plantActivities)
		.orderBy(desc(plantActivities.activityDate))
		.limit(limit);
}
