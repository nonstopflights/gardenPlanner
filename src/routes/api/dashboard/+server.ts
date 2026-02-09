import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const seasonIdParam = url.searchParams.get('seasonId');
		const seasonId = seasonIdParam ? parseInt(seasonIdParam) : undefined;
		
		const [activeSeason, plants, beds, recentJournal, recentActivities] = await Promise.all([
			seasonId ? queries.getSeasonById(seasonId) : queries.getActiveSeason(),
			queries.getAllPlants(),
			queries.getAllBeds(),
			queries.getRecentJournalEntries(5, seasonId),
			queries.getRecentActivities(10, seasonId)
		]);

		const totalPlants = plants.length;
		const currentPlants = plants.filter((p: any) => p.category === 'current').length;
		const wantPlants = plants.filter((p: any) => p.category === 'want').length;
		const totalBeds = beds.length;

		const now = new Date();
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		const upcomingHarvests = plants
			.filter((p: any) => p.category === 'current' && p.plantingDate && p.daysToMaturity)
			.map((p: any) => {
				const plantingDate = new Date(p.plantingDate);
				const harvestDate = new Date(plantingDate.getTime() + p.daysToMaturity * 24 * 60 * 60 * 1000);
				return { ...p, harvestDate: harvestDate.toISOString() };
			})
			.filter((p: any) => {
				const harvestDate = new Date(p.harvestDate);
				return harvestDate >= now && harvestDate <= thirtyDaysFromNow;
			});

		return json({
			activeSeason,
			stats: {
				totalPlants,
				currentPlants,
				wantPlants,
				totalBeds
			},
			recentJournal,
			recentActivities,
			upcomingHarvests
		});
	} catch (err) {
		return json({ error: 'Failed to load dashboard data' }, { status: 500 });
	}
};
