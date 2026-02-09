import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchAllSites } from '$lib/services/seedSiteScraper';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query } = await request.json();

		if (!query) {
			throw error(400, 'Search query required');
		}

		const { results, errors } = await searchAllSites(query);
		return json({ results, errors });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error('Seed search error:', err);
		return json({ results: { johnnyseeds: [], bakercreek: [], burpee: [], territorial: [] }, errors: ['Search failed'] });
	}
};
