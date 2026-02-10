import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchPlantVariety, downloadAndSavePlantImage } from '$lib/services/plantSearch';
import { lookupPlantData } from '$lib/services/openaiEnrichment';
import * as queries from '$lib/db/queries';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query, plantId } = await request.json();

		if (!query) {
			throw error(400, 'Search query required');
		}

		// AI lookup for growing data
		const aiData = await lookupPlantData(query);

		// Then search Trefle/web for additional info (images, descriptions, etc.)
		const searchResult = await searchPlantVariety(query);

		if (!searchResult && !aiData) {
			return json({ error: 'No results found' }, { status: 404 });
		}

		// Merge: start with search result, fill gaps with AI data
		const merged: Record<string, unknown> = { ...(searchResult ?? { name: query }) };
		if (aiData) {
			if (!merged.daysToMaturity && aiData.daysToMaturity) merged.daysToMaturity = aiData.daysToMaturity;
			if (!merged.spacing && aiData.spacing) merged.spacing = aiData.spacing;
			if (!merged.sunRequirements && aiData.sunRequirements) merged.sunRequirements = aiData.sunRequirements;
			if (!merged.waterNeeds && aiData.waterNeeds) merged.waterNeeds = aiData.waterNeeds;
			if (!merged.companionPlants && aiData.companionPlants) merged.companionPlants = aiData.companionPlants;
			if (!merged.plantingSeason && aiData.plantingSeason) merged.plantingSeason = aiData.plantingSeason;
			if (!merged.startIndoorsWeeks && aiData.startIndoorsWeeks != null) merged.startIndoorsWeeks = aiData.startIndoorsWeeks;
			if (!merged.transplantWeeks && aiData.transplantWeeks != null) merged.transplantWeeks = aiData.transplantWeeks;
			if (!merged.directSowWeeks && aiData.directSowWeeks != null) merged.directSowWeeks = aiData.directSowWeeks;
		}

		// If plantId provided, save the web info and download images
		if (plantId) {
			// Save web info
			await queries.savePlantWebInfo({
				plantId,
				searchQuery: query,
				infoJson: JSON.stringify(merged),
				sourceUrl: (merged as any).sourceUrl
			});

			// Download images if available
			const images = (merged as any).images;
			if (images && images.length > 0) {
				for (const imageUrl of images.slice(0, 3)) {
					// Download up to 3 images
					await downloadAndSavePlantImage(imageUrl, plantId);
				}
			}
		}

		return json(merged);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		console.error('Search error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
