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

export type SeedSite = 'johnnyseeds' | 'bakercreek' | 'burpee' | 'territorial';

export const SITE_DISPLAY_NAMES: Record<SeedSite, string> = {
	johnnyseeds: "Johnny's Seeds",
	bakercreek: 'Baker Creek',
	burpee: 'Burpee',
	territorial: 'Territorial Seed'
};

// --- Shared Utilities ---

const HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9'
};

export class CloudflareBlockedError extends Error {
	constructor(site: string) {
		super(`${site} is protected by Cloudflare bot detection and cannot be scraped automatically. Try copying the product details manually.`);
		this.name = 'CloudflareBlockedError';
	}
}

function isCloudflareChallenge(html: string): boolean {
	return (
		html.includes('Just a moment...') ||
		html.includes('_cf_chl_opt') ||
		html.includes('cf-browser-verification') ||
		html.includes('challenge-platform')
	);
}

async function fetchPage(url: string, timeout = 10000): Promise<cheerio.CheerioAPI> {
	try {
		const response = await axios.get(url, { timeout, headers: HEADERS });
		const html = typeof response.data === 'string' ? response.data : '';

		if (isCloudflareChallenge(html)) {
			const hostname = new URL(url).hostname.replace('www.', '');
			throw new CloudflareBlockedError(hostname);
		}

		return cheerio.load(response.data);
	} catch (err) {
		// Cloudflare often returns 403 with a challenge page
		if (axios.isAxiosError(err) && err.response?.data) {
			const html = typeof err.response.data === 'string' ? err.response.data : '';
			if (isCloudflareChallenge(html)) {
				const hostname = new URL(url).hostname.replace('www.', '');
				throw new CloudflareBlockedError(hostname);
			}
		}
		if (err instanceof CloudflareBlockedError) throw err;
		throw err;
	}
}

function parseDaysToMaturity(text: string): number | undefined {
	const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
	if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
	const single = text.match(/(\d+)/);
	return single ? parseInt(single[1]) : undefined;
}

function parsePrice(text: string): number | undefined {
	const match = text.match(/\$?([\d.]+)/);
	return match ? parseFloat(match[1]) : undefined;
}

function parseWeeksFromText(text: string): number | undefined {
	const weekMatch = text.match(/(\d+)\s*[-–]?\s*\d*\s*weeks?\s*(?:before|prior)/i);
	if (weekMatch) return parseInt(weekMatch[1]);
	return undefined;
}

function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href: string, baseUrl: string): string {
	if (!href) return '';
	if (href.startsWith('http')) return href;
	if (href.startsWith('//')) return 'https:' + href;
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return '';
	}
}

export function detectSite(url: string): SeedSite | null {
	if (url.includes('johnnyseeds.com')) return 'johnnyseeds';
	if (url.includes('rareseeds.com')) return 'bakercreek';
	if (url.includes('burpee.com')) return 'burpee';
	if (url.includes('territorialseed.com')) return 'territorial';
	return null;
}

// Extract specs from a text-heavy page by scanning for keywords
function extractSpecsFromText(fullText: string): Partial<SeedProductData> {
	const result: Partial<SeedProductData> = {};

	// Days to maturity
	const maturityMatch = fullText.match(
		/(?:days?\s*(?:to\s*)?maturity|matures?\s*in|harvest\s*in)\s*:?\s*(\d+(?:\s*[-–]\s*\d+)?)\s*days?/i
	);
	if (maturityMatch) result.daysToMaturity = parseDaysToMaturity(maturityMatch[1]);

	// Sun
	const sunMatch = fullText.match(
		/(?:sun|light)\s*(?:requirement|exposure|needs?)?\s*:?\s*(full\s*sun|partial?\s*(?:sun|shade)|full\s*shade)/i
	);
	if (sunMatch) result.sunRequirements = cleanText(sunMatch[1]);

	// Spacing
	const spacingMatch = fullText.match(
		/(?:plant\s*)?spacing\s*:?\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:inches|in\.?|"|feet|ft\.?|cm))/i
	);
	if (spacingMatch) result.spacing = cleanText(spacingMatch[1]);

	// Start indoors
	const indoorMatch = fullText.match(
		/(?:start|sow)\s*(?:seeds?)?\s*indoors?\s*(\d+)\s*[-–]?\s*\d*\s*weeks?\s*(?:before|prior)/i
	);
	if (indoorMatch) result.startIndoorsWeeks = parseInt(indoorMatch[1]);

	return result;
}

// --- Johnny's Seeds ---

async function searchJohnnySeeds(query: string): Promise<SeedSearchResult[]> {
	try {
		const $ = await fetchPage(
			`https://www.johnnyseeds.com/search?q=${encodeURIComponent(query)}`
		);
		const results: SeedSearchResult[] = [];

		// Try multiple selector patterns
		const productCards =
			$('.product-tile').length > 0
				? $('.product-tile')
				: $('.grid-tile').length > 0
					? $('.grid-tile')
					: $('[class*="product"]').filter('div, li, article').slice(0, 12);

		productCards.each((_, el) => {
			const $el = $(el);
			const nameEl =
				$el.find('.product-name a, .name-link, h3 a, h2 a, .tile-body a').first();
			const name = cleanText(nameEl.text());
			const href = nameEl.attr('href');
			if (!name || !href) return;

			const imgEl = $el.find('img').first();
			const imageUrl = absoluteUrl(
				imgEl.attr('src') || imgEl.attr('data-src') || '',
				'https://www.johnnyseeds.com'
			);
			const priceEl = $el.find('.product-sales-price, .price-sales, .price, [class*="price"]').first();

			results.push({
				name,
				url: absoluteUrl(href, 'https://www.johnnyseeds.com'),
				imageUrl: imageUrl || undefined,
				price: priceEl.text().trim() || undefined,
				source: 'johnnyseeds'
			});
		});

		return results.slice(0, 8);
	} catch (error) {
		console.error("[SeedScraper] Johnny's Seeds search failed:", error);
		return [];
	}
}

async function scrapeJohnnySeeds(url: string): Promise<SeedProductData | null> {
	try {
		const $ = await fetchPage(url);
		const result: SeedProductData = {
			name: '',
			productUrl: url,
			images: [],
			source: 'johnnyseeds'
		};

		// --- JSON-LD (most reliable source for name, price, description, images) ---
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).text());
				if (data['@type'] === 'Product') {
					result.name = data.name || result.name;
					if (data.description) result.description = data.description.substring(0, 1000);
					if (data.image) {
						const imgs = Array.isArray(data.image) ? data.image : [data.image];
						result.images.push(...imgs.filter((i: string) => typeof i === 'string'));
					}
					if (data.offers?.price) {
						result.price = `$${data.offers.price}`;
						result.seedCost = parseFloat(data.offers.price);
					}
				}
			} catch {
				// Skip invalid JSON-LD
			}
		});

		// --- Name fallback from HTML ---
		if (!result.name) {
			const h1 = $('h1.product-name');
			if (h1.length) {
				// Get direct text of h1, excluding the alternate name span
				result.name = cleanText(h1.clone().children('span').remove().end().text());
			} else {
				result.name = cleanText($('h1').first().text());
			}
		}

		// --- Variety from alternate name ---
		const altName = $('span.product-alternate-name, span[itemprop="alternateName"]').first().text();
		if (altName) result.variety = cleanText(altName);

		// --- Description fallback ---
		if (!result.description) {
			const desc = $('#collapsible-description-1, .description-and-detail .description, .product-description').first().text();
			if (desc) result.description = cleanText(desc).substring(0, 1000);
		}
		// Also check meta description
		if (!result.description) {
			const metaDesc = $('meta[name="description"]').attr('content');
			if (metaDesc) result.description = cleanText(metaDesc).substring(0, 1000);
		}

		// --- Price fallback from dataLayer ---
		if (!result.price) {
			$('script').each((_, el) => {
				const text = $(el).text();
				const dataLayerMatch = text.match(/dataLayerInitData\s*=\s*(\{[^;]+\})/);
				if (dataLayerMatch) {
					try {
						const dl = JSON.parse(dataLayerMatch[1]);
						const price = dl?.ecommerce?.detail?.products?.[0]?.price;
						if (price) {
							result.price = `$${price}`;
							result.seedCost = parseFloat(price);
						}
					} catch {
						// Skip
					}
				}
			});
		}

		// --- Images from carousel ---
		if (result.images.length === 0) {
			$('.carousel-item img[itemprop="image"], .carousel-item img, .primary-images img').each(
				(_, el) => {
					const src = $(el).attr('src') || $(el).attr('data-src');
					if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('germintation_guides')) {
						result.images.push(absoluteUrl(src, 'https://www.johnnyseeds.com'));
					}
				}
			);
		}

		// --- Quick Facts (dt.c-facts__term / dd.c-facts__definition pairs) ---
		$('dt.c-facts__term').each((_, el) => {
			const labelEl = $(el).find('h3');
			const label = (labelEl.attr('title') || cleanText(labelEl.text())).toLowerCase();
			const valueEl = $(el).next('dd.c-facts__definition');
			const value = cleanText(valueEl.find('h4').text() || valueEl.text());
			if (!label || !value) return;

			if (label.includes('maturity') || label.includes('days'))
				result.daysToMaturity = parseDaysToMaturity(value);
			else if (label.includes('spacing')) result.spacing = value;
			else if (label.includes('sun') || label.includes('light'))
				result.sunRequirements = value;
			else if (label.includes('water')) result.waterNeeds = value;
		});

		// --- Growing Information (accordion body with h2 section headers) ---
		const growingBody = $('.c-accordion__body.s-lgc-pdp-content, .js-accordion__body').first();
		if (growingBody.length) {
			// Parse h2-delimited sections from the growing info HTML
			const html = growingBody.html() || '';
			const sections = parseGrowingInfoSections(html);

			const growingParts: string[] = [];
			const harvestParts: string[] = [];

			for (const [heading, content] of Object.entries(sections)) {
				const h = heading.toUpperCase();
				const text = cleanText(content.replace(/<[^>]+>/g, ' '));

				if (h.includes('CULTURE') || h.includes('SOIL')) {
					growingParts.push(`Culture: ${text}`);
				} else if (h.includes('TRANSPLANT')) {
					growingParts.push(`Transplanting: ${text}`);
					// Try to parse weeks for transplanting
					const weeksMatch = text.match(/(\d+)\s*weeks?\s*(?:before|prior)/i);
					if (weeksMatch) result.startIndoorsWeeks = parseInt(weeksMatch[1]);
				} else if (h.includes('DIRECT SEED') || h.includes('DIRECT SOW')) {
					growingParts.push(`Direct Seeding: ${text}`);
				} else if (h.includes('SPACING') || h.includes('PLANT SPACING')) {
					if (!result.spacing) result.spacing = text;
					growingParts.push(`Spacing: ${text}`);
				} else if (h.includes('DISEASE')) {
					growingParts.push(`Diseases: ${text}`);
				} else if (h.includes('INSECT') || h.includes('PEST')) {
					growingParts.push(`Pests: ${text}`);
				} else if (h.includes('HARVEST')) {
					harvestParts.push(`Harvest: ${text}`);
				} else if (h.includes('STORAGE')) {
					harvestParts.push(`Storage: ${text}`);
				}
			}

			if (growingParts.length > 0) {
				result.growingNotes = growingParts.join('\n\n').substring(0, 2000);
			}
			if (harvestParts.length > 0) {
				result.harvestingNotes = harvestParts.join('\n\n').substring(0, 2000);
			}
		}

		// --- Fallback: scan full text for specs ---
		const fullText = $('body').text();
		const textSpecs = extractSpecsFromText(fullText);
		if (!result.daysToMaturity && textSpecs.daysToMaturity)
			result.daysToMaturity = textSpecs.daysToMaturity;
		if (!result.spacing && textSpecs.spacing) result.spacing = textSpecs.spacing;
		if (!result.sunRequirements && textSpecs.sunRequirements)
			result.sunRequirements = textSpecs.sunRequirements;
		if (!result.startIndoorsWeeks && textSpecs.startIndoorsWeeks)
			result.startIndoorsWeeks = textSpecs.startIndoorsWeeks;

		return result.name ? result : null;
	} catch (error) {
		console.error("[SeedScraper] Johnny's Seeds scrape failed:", error);
		return null;
	}
}

// Parse Johnny's Seeds growing information sections separated by h2 headings
function parseGrowingInfoSections(html: string): Record<string, string> {
	const sections: Record<string, string> = {};
	// Split on <h2> tags, capturing the heading text
	const parts = html.split(/<h2[^>]*>/i);
	for (const part of parts) {
		const endTag = part.indexOf('</h2>');
		if (endTag === -1) continue;
		const heading = part.substring(0, endTag).replace(/<[^>]+>/g, '').trim();
		const content = part.substring(endTag + 5).trim();
		if (heading) {
			sections[heading.replace(/:$/, '')] = content;
		}
	}
	return sections;
}

// --- Baker Creek (Rare Seeds) ---

async function searchBakerCreek(query: string): Promise<SeedSearchResult[]> {
	try {
		const $ = await fetchPage(
			`https://www.rareseeds.com/catalogsearch/result/?q=${encodeURIComponent(query)}`
		);
		const results: SeedSearchResult[] = [];

		const productCards =
			$('.product-item').length > 0
				? $('.product-item')
				: $('[class*="product"]').filter('li, div, article').slice(0, 12);

		productCards.each((_, el) => {
			const $el = $(el);
			const nameEl = $el.find('.product-item-link, .product-name a, h3 a, h2 a, a[title]').first();
			const name = cleanText(nameEl.text() || nameEl.attr('title') || '');
			const href = nameEl.attr('href');
			if (!name || !href) return;

			const imgEl = $el.find('.product-image-photo, img').first();
			const imageUrl = absoluteUrl(
				imgEl.attr('src') || imgEl.attr('data-src') || '',
				'https://www.rareseeds.com'
			);
			const priceEl = $el.find('.price-wrapper .price, .price').first();

			results.push({
				name,
				url: absoluteUrl(href, 'https://www.rareseeds.com'),
				imageUrl: imageUrl || undefined,
				price: priceEl.text().trim() || undefined,
				source: 'bakercreek'
			});
		});

		return results.slice(0, 8);
	} catch (error) {
		if (error instanceof CloudflareBlockedError) {
			console.warn('[SeedScraper] Baker Creek blocked by Cloudflare');
		} else {
			console.error('[SeedScraper] Baker Creek search failed:', error);
		}
		return [];
	}
}

async function scrapeBakerCreek(url: string): Promise<SeedProductData | null> {
	try {
		const $ = await fetchPage(url);
		const result: SeedProductData = {
			name: '',
			productUrl: url,
			images: [],
			source: 'bakercreek'
		};

		result.name = cleanText($('h1.page-title, .product-info-main h1, h1').first().text());

		const desc = $(
			'.product.attribute.description .value, .product-description, .description .value'
		)
			.first()
			.text();
		if (desc) {
			result.description = cleanText(desc).substring(0, 1000);
			// Baker Creek often embeds growing info in description
			result.growingNotes = cleanText(desc).substring(0, 1000);
		}

		const priceText = $(
			'.product-info-price .price, .price-box .price, .price-wrapper .price'
		)
			.first()
			.text();
		if (priceText) {
			result.price = priceText.trim();
			result.seedCost = parsePrice(priceText);
		}

		$('.gallery-placeholder img, .fotorama img, .product-image-photo').each((_, el) => {
			const src = $(el).attr('src') || $(el).attr('data-src');
			if (src && !src.includes('icon') && !src.includes('logo')) {
				result.images.push(absoluteUrl(src, 'https://www.rareseeds.com'));
			}
		});

		// Parse specs from attribute table
		$('.additional-attributes td, .product-attributes-wrapper tr, .data.table tr').each(
			(_, el) => {
				const label = cleanText($(el).find('th, .label').text()).toLowerCase();
				const value = cleanText($(el).find('td, .data').text());
				if (!label || !value) return;

				if (label.includes('maturity') || label.includes('days'))
					result.daysToMaturity = parseDaysToMaturity(value);
				else if (label.includes('spacing')) result.spacing = value;
				else if (label.includes('sun') || label.includes('light'))
					result.sunRequirements = value;
			}
		);

		const fullText = $('body').text();
		const textSpecs = extractSpecsFromText(fullText);
		if (!result.daysToMaturity && textSpecs.daysToMaturity)
			result.daysToMaturity = textSpecs.daysToMaturity;
		if (!result.spacing && textSpecs.spacing) result.spacing = textSpecs.spacing;
		if (!result.sunRequirements && textSpecs.sunRequirements)
			result.sunRequirements = textSpecs.sunRequirements;

		return result.name ? result : null;
	} catch (error) {
		if (error instanceof CloudflareBlockedError) throw error;
		console.error('[SeedScraper] Baker Creek scrape failed:', error);
		return null;
	}
}

// --- Burpee ---

async function searchBurpee(query: string): Promise<SeedSearchResult[]> {
	try {
		const $ = await fetchPage(`https://www.burpee.com/search?q=${encodeURIComponent(query)}`);
		const results: SeedSearchResult[] = [];

		// Burpee may use JSON-LD or server-rendered content
		// Try JSON-LD first
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).text());
				if (data['@type'] === 'ItemList' && data.itemListElement) {
					for (const item of data.itemListElement.slice(0, 8)) {
						if (item.name && item.url) {
							results.push({
								name: item.name,
								url: absoluteUrl(item.url, 'https://www.burpee.com'),
								imageUrl: item.image || undefined,
								price: item.offers?.price ? `$${item.offers.price}` : undefined,
								source: 'burpee'
							});
						}
					}
				}
			} catch {
				// Invalid JSON, skip
			}
		});

		if (results.length > 0) return results;

		// Fallback to HTML selectors
		const productCards =
			$('.product-card').length > 0
				? $('.product-card')
				: $('[class*="product-tile"], [class*="product-item"]')
						.filter('div, li, article')
						.slice(0, 12);

		productCards.each((_, el) => {
			const $el = $(el);
			const nameEl = $el.find('.product-card__name, .product-name, h3 a, h2 a, a').first();
			const name = cleanText(nameEl.text());
			const href = nameEl.attr('href') || $el.find('a').first().attr('href');
			if (!name || !href) return;

			const imgEl = $el.find('img').first();
			const priceEl = $el.find('[class*="price"]').first();

			results.push({
				name,
				url: absoluteUrl(href, 'https://www.burpee.com'),
				imageUrl: absoluteUrl(imgEl.attr('src') || '', 'https://www.burpee.com') || undefined,
				price: priceEl.text().trim() || undefined,
				source: 'burpee'
			});
		});

		return results.slice(0, 8);
	} catch (error) {
		console.error('[SeedScraper] Burpee search failed:', error);
		return [];
	}
}

async function scrapeBurpee(url: string): Promise<SeedProductData | null> {
	try {
		const $ = await fetchPage(url);
		const result: SeedProductData = {
			name: '',
			productUrl: url,
			images: [],
			source: 'burpee'
		};

		// Try JSON-LD first (Burpee often includes structured data)
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).text());
				if (data['@type'] === 'Product') {
					result.name = data.name || result.name;
					result.description = data.description?.substring(0, 1000) || result.description;
					if (data.image) {
						const imgs = Array.isArray(data.image) ? data.image : [data.image];
						result.images.push(...imgs.filter((i: string) => typeof i === 'string'));
					}
					if (data.offers?.price) {
						result.price = `$${data.offers.price}`;
						result.seedCost = parseFloat(data.offers.price);
					}
				}
			} catch {
				// Skip invalid JSON
			}
		});

		// HTML fallbacks
		if (!result.name) {
			result.name = cleanText($('h1.product-name, h1').first().text());
		}

		if (!result.description) {
			const desc = $(
				'.product-description, [class*="description"], .product-detail'
			)
				.first()
				.text();
			if (desc) result.description = cleanText(desc).substring(0, 1000);
		}

		if (result.images.length === 0) {
			$('.product-gallery img, .pdp-hero img, picture img').each((_, el) => {
				const src = $(el).attr('src') || $(el).attr('data-src');
				if (src && !src.includes('icon')) {
					result.images.push(absoluteUrl(src, 'https://www.burpee.com'));
				}
			});
		}

		// Specs table
		$('.product-specs tr, [class*="spec"] tr, .growing-guide tr, .product-attributes tr').each(
			(_, el) => {
				const label = cleanText($(el).find('th, td:first-child, .label').text()).toLowerCase();
				const value = cleanText($(el).find('td:last-child, .value').text());
				if (!label || !value) return;

				if (label.includes('maturity') || label.includes('days'))
					result.daysToMaturity = parseDaysToMaturity(value);
				else if (label.includes('spacing')) result.spacing = value;
				else if (label.includes('sun') || label.includes('light'))
					result.sunRequirements = value;
				else if (label.includes('water')) result.waterNeeds = value;
				else if (label.includes('harvest')) result.harvestingNotes = value;
			}
		);

		const fullText = $('body').text();
		const textSpecs = extractSpecsFromText(fullText);
		if (!result.daysToMaturity && textSpecs.daysToMaturity)
			result.daysToMaturity = textSpecs.daysToMaturity;
		if (!result.spacing && textSpecs.spacing) result.spacing = textSpecs.spacing;
		if (!result.sunRequirements && textSpecs.sunRequirements)
			result.sunRequirements = textSpecs.sunRequirements;
		if (!result.startIndoorsWeeks && textSpecs.startIndoorsWeeks)
			result.startIndoorsWeeks = textSpecs.startIndoorsWeeks;

		return result.name ? result : null;
	} catch (error) {
		console.error('[SeedScraper] Burpee scrape failed:', error);
		return null;
	}
}

// --- Territorial Seed ---

async function searchTerritorial(query: string): Promise<SeedSearchResult[]> {
	try {
		const $ = await fetchPage(
			`https://www.territorialseed.com/search?q=${encodeURIComponent(query)}`
		);
		const results: SeedSearchResult[] = [];

		const productCards =
			$('.product-item, .product-card').length > 0
				? $('.product-item, .product-card')
				: $('[class*="product"]').filter('div, li, article').slice(0, 12);

		productCards.each((_, el) => {
			const $el = $(el);
			const nameEl = $el.find('.product-name a, .product-title a, h3 a, h2 a, a[title]').first();
			const name = cleanText(nameEl.text() || nameEl.attr('title') || '');
			const href = nameEl.attr('href') || $el.find('a').first().attr('href');
			if (!name || !href) return;

			const imgEl = $el.find('img').first();
			const priceEl = $el.find('.product-price, .price, [class*="price"]').first();

			results.push({
				name,
				url: absoluteUrl(href, 'https://www.territorialseed.com'),
				imageUrl:
					absoluteUrl(
						imgEl.attr('src') || imgEl.attr('data-src') || '',
						'https://www.territorialseed.com'
					) || undefined,
				price: priceEl.text().trim() || undefined,
				source: 'territorial'
			});
		});

		return results.slice(0, 8);
	} catch (error) {
		console.error('[SeedScraper] Territorial search failed:', error);
		return [];
	}
}

async function scrapeTerritorial(url: string): Promise<SeedProductData | null> {
	try {
		const $ = await fetchPage(url);
		const result: SeedProductData = {
			name: '',
			productUrl: url,
			images: [],
			source: 'territorial'
		};

		// Try JSON-LD
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).text());
				if (data['@type'] === 'Product') {
					result.name = data.name || result.name;
					result.description = data.description?.substring(0, 1000) || result.description;
					if (data.image) {
						const imgs = Array.isArray(data.image) ? data.image : [data.image];
						result.images.push(...imgs.filter((i: string) => typeof i === 'string'));
					}
					if (data.offers?.price) {
						result.price = `$${data.offers.price}`;
						result.seedCost = parseFloat(data.offers.price);
					}
				}
			} catch {
				// Skip
			}
		});

		if (!result.name) {
			result.name = cleanText($('h1.product-title, h1.product-name, h1').first().text());
		}

		if (!result.description) {
			const desc = $(
				'.product-description, #description, .product-detail-description, [class*="description"]'
			)
				.first()
				.text();
			if (desc) result.description = cleanText(desc).substring(0, 1000);
		}

		if (!result.price) {
			const priceText = $(
				'.product-price .price, [data-price], .price-wrapper .price'
			)
				.first()
				.text();
			if (priceText) {
				result.price = priceText.trim();
				result.seedCost = parsePrice(priceText);
			}
		}

		if (result.images.length === 0) {
			$('.product-gallery img, .product-image img, .product-media img').each((_, el) => {
				const src = $(el).attr('src') || $(el).attr('data-src');
				if (src && !src.includes('icon') && !src.includes('logo')) {
					result.images.push(absoluteUrl(src, 'https://www.territorialseed.com'));
				}
			});
		}

		// Specs from tables/lists
		$(
			'.product-specs tr, .product-attributes tr, dl dt, .product-detail tr, [class*="spec"] tr'
		).each((_, el) => {
			const label = cleanText(
				$(el).find('th, td:first-child, dt, .label').text()
			).toLowerCase();
			const value = cleanText($(el).find('td:last-child, dd, .value').text());
			if (!label || !value) return;

			if (label.includes('maturity') || label.includes('days'))
				result.daysToMaturity = parseDaysToMaturity(value);
			else if (label.includes('spacing')) result.spacing = value;
			else if (label.includes('sun') || label.includes('light') || label.includes('exposure'))
				result.sunRequirements = value;
			else if (label.includes('water')) result.waterNeeds = value;
			else if (label.includes('harvest')) result.harvestingNotes = value;
		});

		const fullText = $('body').text();
		const textSpecs = extractSpecsFromText(fullText);
		if (!result.daysToMaturity && textSpecs.daysToMaturity)
			result.daysToMaturity = textSpecs.daysToMaturity;
		if (!result.spacing && textSpecs.spacing) result.spacing = textSpecs.spacing;
		if (!result.sunRequirements && textSpecs.sunRequirements)
			result.sunRequirements = textSpecs.sunRequirements;
		if (!result.startIndoorsWeeks && textSpecs.startIndoorsWeeks)
			result.startIndoorsWeeks = textSpecs.startIndoorsWeeks;

		if (!result.growingNotes && result.description) {
			result.growingNotes = result.description;
		}

		return result.name ? result : null;
	} catch (error) {
		console.error('[SeedScraper] Territorial scrape failed:', error);
		return null;
	}
}

// --- Public API ---

const SCRAPERS: Record<SeedSite, {
	search: (query: string) => Promise<SeedSearchResult[]>;
	scrapeProduct: (url: string) => Promise<SeedProductData | null>;
}> = {
	johnnyseeds: { search: searchJohnnySeeds, scrapeProduct: scrapeJohnnySeeds },
	bakercreek: { search: searchBakerCreek, scrapeProduct: scrapeBakerCreek },
	burpee: { search: searchBurpee, scrapeProduct: scrapeBurpee },
	territorial: { search: searchTerritorial, scrapeProduct: scrapeTerritorial }
};

export async function searchAllSites(
	query: string
): Promise<{ results: Record<SeedSite, SeedSearchResult[]>; errors: string[] }> {
	const sites: SeedSite[] = ['johnnyseeds', 'bakercreek', 'burpee', 'territorial'];
	const errors: string[] = [];

	const settled = await Promise.allSettled(
		sites.map((site) => SCRAPERS[site].search(query))
	);

	const results: Record<SeedSite, SeedSearchResult[]> = {
		johnnyseeds: [],
		bakercreek: [],
		burpee: [],
		territorial: []
	};

	settled.forEach((outcome, i) => {
		const site = sites[i];
		if (outcome.status === 'fulfilled') {
			results[site] = outcome.value;
		} else {
			errors.push(`${SITE_DISPLAY_NAMES[site]}: ${outcome.reason?.message || 'failed'}`);
		}
	});

	return { results, errors };
}

export async function scrapeProductUrl(url: string): Promise<SeedProductData | null> {
	const site = detectSite(url);
	if (!site) return null;
	return SCRAPERS[site].scrapeProduct(url);
}

// Export for image search to reuse site search results
export async function searchSiteImages(
	query: string
): Promise<{ url: string; source: string; alt: string }[]> {
	const { results } = await searchAllSites(query);
	const images: { url: string; source: string; alt: string }[] = [];

	for (const [site, searchResults] of Object.entries(results)) {
		for (const result of searchResults) {
			if (result.imageUrl) {
				images.push({
					url: result.imageUrl,
					source: SITE_DISPLAY_NAMES[site as SeedSite],
					alt: result.name
				});
			}
		}
	}

	return images;
}
