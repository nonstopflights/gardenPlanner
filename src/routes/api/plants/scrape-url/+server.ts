import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scrapeProductUrl, detectSite, SITE_DISPLAY_NAMES, CloudflareBlockedError } from '$lib/services/seedSiteScraper';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url } = await request.json();

		if (!url) {
			throw error(400, 'URL is required');
		}

		const site = detectSite(url);
		if (!site) {
			const supported = Object.values(SITE_DISPLAY_NAMES).join(', ');
			return json(
				{ error: `Unsupported website. Supported sites: ${supported}` },
				{ status: 400 }
			);
		}

		const data = await scrapeProductUrl(url);

		if (!data) {
			return json(
				{ error: 'Could not extract product data from this page' },
				{ status: 404 }
			);
		}

		return json(data);
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		if (err instanceof CloudflareBlockedError) {
			return json({ error: err.message }, { status: 403 });
		}
		console.error('Scrape URL error:', err);
		return json({ error: 'Failed to scrape URL' }, { status: 500 });
	}
};
