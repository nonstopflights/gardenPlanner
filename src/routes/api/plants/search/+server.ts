import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchPlantVariety, downloadAndSavePlantImage } from '$lib/services/plantSearch';
import * as queries from '$lib/db/queries';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query, plantId } = await request.json();

		if (!query) {
			throw error(400, 'Search query required');
		}

		// Search for plant information
		const searchResult = await searchPlantVariety(query);

		if (!searchResult) {
			return json({ error: 'No results found' }, { status: 404 });
		}

		// If plantId provided, save the web info and download images
		if (plantId) {
			// Save web info
			await queries.savePlantWebInfo({
				plantId,
				searchQuery: query,
				infoJson: JSON.stringify(searchResult),
				sourceUrl: searchResult.sourceUrl
			});

			// Download images if available
			if (searchResult.images && searchResult.images.length > 0) {
				for (const imageUrl of searchResult.images.slice(0, 3)) {
					// Download up to 3 images
					await downloadAndSavePlantImage(imageUrl, plantId);
				}
			}
		}

		return json(searchResult);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		console.error('Search error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
