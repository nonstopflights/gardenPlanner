import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Scraping has been replaced by AI-powered plant lookup via /api/plants/search-seeds
export const POST: RequestHandler = async () => {
	return json({ error: 'URL scraping has been replaced by AI plant lookup. Use the search instead.' }, { status: 410 });
};

// --- Old scraping endpoint (commented out) ---
// import { scrapeProductUrl, detectSite, SITE_DISPLAY_NAMES, CloudflareBlockedError } from '$lib/services/seedSiteScraper';
// import { enrichPlantData } from '$lib/services/openaiEnrichment';
//
// export const POST: RequestHandler = async ({ request }) => {
// 	try {
// 		const { url } = await request.json();
//
// 		if (!url) {
// 			throw error(400, 'URL is required');
// 		}
//
// 		const site = detectSite(url);
// 		if (!site) {
// 			const supported = Object.values(SITE_DISPLAY_NAMES).join(', ');
// 			return json(
// 				{ error: `Unsupported website. Supported sites: ${supported}` },
// 				{ status: 400 }
// 			);
// 		}
//
// 		const data = await scrapeProductUrl(url);
//
// 		if (!data) {
// 			return json(
// 				{ error: 'Could not extract product data from this page' },
// 				{ status: 404 }
// 			);
// 		}
//
// 		// Enrich with AI-generated growing data for any missing fields
// 		if (data.name) {
// 			const aiData = await enrichPlantData(data.name, data.description);
// 			if (!data.daysToMaturity && aiData.daysToMaturity) data.daysToMaturity = aiData.daysToMaturity;
// 			if (!data.spacing && aiData.spacing) data.spacing = aiData.spacing;
// 			if (!data.sunRequirements && aiData.sunRequirements) data.sunRequirements = aiData.sunRequirements;
// 			if (!data.waterNeeds && aiData.waterNeeds) data.waterNeeds = aiData.waterNeeds;
// 			if (!data.growingNotes && aiData.growingNotes) data.growingNotes = aiData.growingNotes;
// 			if (!data.harvestingNotes && aiData.harvestingNotes) data.harvestingNotes = aiData.harvestingNotes;
// 			if (!data.startIndoorsWeeks && aiData.startIndoorsWeeks) data.startIndoorsWeeks = aiData.startIndoorsWeeks;
// 			if (!data.directSowWeeks && aiData.directSowWeeks) data.directSowWeeks = aiData.directSowWeeks;
// 		}
//
// 		return json(data);
// 	} catch (err) {
// 		if (err instanceof Error && 'status' in err) throw err;
// 		if (err instanceof CloudflareBlockedError) {
// 			return json({ error: err.message }, { status: 403 });
// 		}
// 		console.error('Scrape URL error:', err);
// 		return json({ error: 'Failed to scrape URL' }, { status: 500 });
// 	}
// };
