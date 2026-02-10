import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { env } from '$env/dynamic/private';
// import { searchSiteImages } from '$lib/services/seedSiteScraper';

interface ImageCandidate {
	url: string;
	source: string;
	alt: string;
}

const HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function searchTrefleImages(query: string): Promise<ImageCandidate[]> {
	const apiToken = env.TREFLE_API_TOKEN;
	if (!apiToken) return [];

	try {
		const searchUrl = `https://trefle.io/api/v1/plants/search?token=${apiToken}&q=${encodeURIComponent(query)}`;
		const response = await axios.get(searchUrl, { timeout: 8000 });
		const images: ImageCandidate[] = [];

		if (response.data?.data) {
			for (const plant of response.data.data.slice(0, 5)) {
				if (plant.image_url) {
					images.push({
						url: plant.image_url,
						source: 'Trefle',
						alt: plant.common_name || plant.scientific_name || query
					});
				}
			}
		}

		return images;
	} catch {
		return [];
	}
}

async function searchBingImages(query: string): Promise<ImageCandidate[]> {
	try {
		const response = await axios.get(
			`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`,
			{ timeout: 8000, headers: HEADERS }
		);
		const html = response.data as string;
		const images: ImageCandidate[] = [];

		// Extract full-resolution image URLs from Bing's murl (media URL) data
		const murlPattern = /murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g;
		let match;
		while ((match = murlPattern.exec(html)) !== null && images.length < 15) {
			const url = match[1];
			if (url && !url.includes('bing.com') && !url.includes('microsoft.com')) {
				images.push({ url, source: 'Web', alt: query });
			}
		}

		return images;
	} catch {
		return [];
	}
}

async function searchWikipediaImages(query: string): Promise<ImageCandidate[]> {
	try {
		const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
		const response = await axios.get(wikiUrl, { timeout: 8000, headers: HEADERS });
		const $ = cheerio.load(response.data);
		const images: ImageCandidate[] = [];

		$('.infobox img, .thumbimage, .mw-file-element').each((_, el) => {
			const src = $(el).attr('src');
			if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('.svg')) {
				const fullUrl = src.startsWith('http') ? src : `https:${src}`;
				// Get a larger version by modifying the thumbnail URL
				const largerUrl = fullUrl.replace(/\/\d+px-/, '/400px-');
				images.push({
					url: largerUrl,
					source: 'Wikipedia',
					alt: $(el).attr('alt') || query
				});
			}
		});

		return images.slice(0, 5);
	} catch {
		return [];
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query } = await request.json();
		if (!query) {
			throw error(400, 'Search query required');
		}

		// Search all sources in parallel
		const [bingImages, trefleImages, wikiImages] = await Promise.all([
			searchBingImages(query).catch(() => [] as ImageCandidate[]),
			searchTrefleImages(query).catch(() => [] as ImageCandidate[]),
			searchWikipediaImages(query).catch(() => [] as ImageCandidate[])
		]);

		// Combine and deduplicate by URL — web results first for best coverage
		const seen = new Set<string>();
		const allImages: ImageCandidate[] = [];

		for (const img of [...bingImages, ...trefleImages, ...wikiImages]) {
			if (!seen.has(img.url) && img.url) {
				seen.add(img.url);
				allImages.push(img);
			}
		}

		return json({ images: allImages });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error('Image search error:', err);
		return json({ images: [] });
	}
};
