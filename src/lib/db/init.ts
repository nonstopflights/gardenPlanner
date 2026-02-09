import { db } from './client';
import { beds, seasons, bedPlants } from './schema';
import { eq, isNull } from 'drizzle-orm';

export async function initializeDatabase() {
	try {
		// Check if beds already exist
		const existingBeds = await db.select().from(beds);

		if (existingBeds.length === 0) {
			// Create 12 default beds
			const bedData = Array.from({ length: 12 }, (_, i) => ({
				name: `Bed ${i + 1}`,
				width: 4,
				height: 8,
				cornerRadius: 0.5
			}));

			await db.insert(beds).values(bedData);
			console.log('Initialized 12 default beds');
		} else {
			console.log(`Found ${existingBeds.length} existing beds`);
		}

		// Check if seasons already exist
		const existingSeasons = await db.select().from(seasons);

		if (existingSeasons.length === 0) {
			const currentYear = new Date().getFullYear();
			const result = await db
				.insert(seasons)
				.values({
					name: `Spring ${currentYear}`,
					year: currentYear,
					type: 'spring',
					startDate: `${currentYear}-03-01`,
					endDate: `${currentYear}-05-31`,
					isActive: true
				})
				.returning();

			const defaultSeason = result[0];
			console.log(`Initialized default season: ${defaultSeason.name}`);

			// Assign any existing bed-plants without a season to the default season
			await db
				.update(bedPlants)
				.set({ seasonId: defaultSeason.id })
				.where(isNull(bedPlants.seasonId));
		} else {
			console.log(`Found ${existingSeasons.length} existing seasons`);

			// Ensure at least one season is active
			const activeSeason = existingSeasons.find((s) => s.isActive);
			if (!activeSeason && existingSeasons.length > 0) {
				await db
					.update(seasons)
					.set({ isActive: true })
					.where(eq(seasons.id, existingSeasons[0].id));
			}
		}
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
}
