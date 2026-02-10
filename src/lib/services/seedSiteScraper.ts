// --- Seed Site Scraper (commented out — replaced by AI plant lookup) ---
// This file previously scraped seed sites for plant data.
// The functionality has been replaced by openaiEnrichment.ts → lookupPlantData()

/*
import axios from 'axios';
import * as cheerio from 'cheerio';

// --- Types ---

export interface SeedSearchResult {
	name: string;
	variety?: string;
	url: string;
	imageUrl?: string;
	price?: string;
	source: SeedSite;
}

export interface SeedProductData {
	name: string;
	variety?: string;
	description?: string;
	spacing?: string;
	sunRequirements?: string;
	waterNeeds?: string;
	daysToMaturity?: number;
	growingNotes?: string;
	harvestingNotes?: string;
	price?: string;
	seedCost?: number;
	productUrl: string;
	images: string[];
	source: SeedSite;
	plantingSeason?: string;
	startIndoorsWeeks?: number;
	directSowWeeks?: number;
}

export type SeedSite = 'johnnyseeds' | 'bakercreek' | 'burpee' | 'territorial' | 'botanicalinterests';

export const SITE_DISPLAY_NAMES: Record<SeedSite, string> = {
	johnnyseeds: "Johnny's Seeds",
	bakercreek: 'Baker Creek',
	burpee: 'Burpee',
	territorial: 'Territorial Seed',
	botanicalinterests: 'Botanical Interests'
};

// ... (rest of scraping implementation removed for brevity)

export class CloudflareBlockedError extends Error {
	constructor(site: string) {
		super(`${site} is protected by Cloudflare bot detection and cannot be scraped automatically.`);
		this.name = 'CloudflareBlockedError';
	}
}

export function detectSite(url: string): SeedSite | null {
	if (url.includes('johnnyseeds.com')) return 'johnnyseeds';
	if (url.includes('rareseeds.com')) return 'bakercreek';
	if (url.includes('burpee.com')) return 'burpee';
	if (url.includes('territorialseed.com')) return 'territorial';
	if (url.includes('botanicalinterests.com')) return 'botanicalinterests';
	return null;
}

export async function searchAllSites(query: string): Promise<{ results: Record<SeedSite, SeedSearchResult[]>; errors: string[] }> { ... }
export async function scrapeProductUrl(url: string): Promise<SeedProductData | null> { ... }
export async function searchSiteImages(query: string): Promise<{ url: string; source: string; alt: string }[]> { ... }
*/
