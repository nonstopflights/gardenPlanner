import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lookupPlantData } from '$lib/services/openaiEnrichment';

// import { searchAllSites } from '$lib/services/seedSiteScraper';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { query } = await request.json();

		if (!query) {
			throw error(400, 'Search query required');
		}

		// Run AI lookup and image search in parallel
		const [result, imageRes] = await Promise.all([
			lookupPlantData(query),
			fetch('/api/plants/search-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			}).then(r => r.json()).catch(() => ({ images: [] }))
		]);

		if (!result) {
			return json({ error: 'Could not look up plant data. Check your OpenAI API key.' }, { status: 500 });
		}

		// Attach images from web search
		const images = (imageRes.images || []).map((img: { url: string }) => img.url);

		return json({ ...result, images });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error('Plant lookup error:', err);
		return json({ error: 'Plant lookup failed' }, { status: 500 });
	}
};
