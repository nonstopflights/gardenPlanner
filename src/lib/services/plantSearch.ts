import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import { env } from '$env/dynamic/private';
import * as queries from '$lib/db/queries';

interface PlantSearchResult {
	name: string;
	variety?: string;
	description?: string;
	images?: string[];
	spacing?: string;
	sunRequirements?: string;
	waterNeeds?: string;
	daysToMaturity?: number;
	growingNotes?: string;
	harvestingNotes?: string;
	sourceUrl?: string;
}

// Search using Trefle API (https://trefle.io/)
export async function searchPlantVariety(query: string): Promise<PlantSearchResult | null> {
	// Use SvelteKit's $env/dynamic/private for runtime environment variables
	const apiToken = env.TREFLE_API_TOKEN;
	
	if (!apiToken) {
		console.warn('TREFLE_API_TOKEN not set. Please set it in your .env file in the project root.');
		console.warn('Make sure to restart your dev server after adding the token to .env');
		console.warn('Current env keys available:', Object.keys(env).slice(0, 10).join(', '));
		// Fallback: return basic result
		return {
			name: query,
			description: `Information about ${query}. Please configure TREFLE_API_TOKEN in your .env file to get detailed information from Trefle.io.`
		};
	}

	try {
		// Search for plants using Trefle API
		const searchUrl = `https://trefle.io/api/v1/plants/search?token=${apiToken}&q=${encodeURIComponent(query)}`;
		console.log('[Trefle Debug] Searching for:', query);
		console.log('[Trefle Debug] Search URL:', searchUrl.replace(apiToken, 'TOKEN_HIDDEN'));
		
		const response = await axios.get(searchUrl, { timeout: 10000 });
		console.log('[Trefle Debug] Response status:', response.status);
		console.log('[Trefle Debug] Results count:', response.data?.data?.length || 0);

		if (response.data?.data && response.data.data.length > 0) {
			const plant = response.data.data[0];
			console.log('[Trefle Debug] Found plant:', plant.common_name || plant.scientific_name);
			console.log('[Trefle Debug] Plant ID:', plant.id);
			
			// Get detailed information if we have a plant ID
			let detailedInfo: any = null;
			if (plant.id) {
				try {
					const detailUrl = `https://trefle.io/api/v1/plants/${plant.id}?token=${apiToken}`;
					console.log('[Trefle Debug] Fetching details from:', detailUrl.replace(apiToken, 'TOKEN_HIDDEN'));
					const detailResponse = await axios.get(detailUrl, { timeout: 10000 });
					detailedInfo = detailResponse.data?.data;
					console.log('[Trefle Debug] Details fetched successfully');
				} catch (detailError: any) {
					console.error('[Trefle Debug] Error fetching plant details:', detailError.response?.status, detailError.message);
				}
			}

			const result: PlantSearchResult = {
				name: plant.common_name || plant.scientific_name || query,
				variety: plant.scientific_name !== plant.common_name ? plant.scientific_name : undefined,
				description: detailedInfo?.description || plant.slug || `Information about ${plant.common_name || query}`,
				sourceUrl: `https://trefle.io/plants/${plant.id || plant.slug}`
			};

			// Extract images
			const images: string[] = [];
			if (plant.image_url) {
				images.push(plant.image_url);
			}
			if (detailedInfo?.image_url && detailedInfo.image_url !== plant.image_url) {
				images.push(detailedInfo.image_url);
			}
			if (images.length > 0) {
				result.images = images;
			}

			// Extract growth information from detailed data
			if (detailedInfo) {
				const notes: string[] = [];
				
				// Map Trefle's data structure to our format
				if (detailedInfo.growth) {
					const growth = detailedInfo.growth;
					if (growth.habit) {
						notes.push(`Growth habit: ${growth.habit}`);
					}
					if (growth.rate) {
						notes.push(`Growth rate: ${growth.rate}`);
					}
					if (growth.shade_tolerance) {
						result.sunRequirements = growth.shade_tolerance;
					}
					if (growth.drought_tolerance) {
						result.waterNeeds = growth.drought_tolerance;
					}
				}
				
				if (detailedInfo.specifications) {
					const specs = detailedInfo.specifications;
					if (specs.minimum_temperature) {
						const temp = specs.minimum_temperature.deg_f || specs.minimum_temperature.deg_c;
						notes.push(`Minimum temperature: ${temp}°`);
					}
					if (specs.ph_minimum && specs.ph_maximum) {
						notes.push(`pH range: ${specs.ph_minimum}-${specs.ph_maximum}`);
					}
					if (specs.root_depth_minimum) {
						notes.push(`Root depth: ${specs.root_depth_minimum} cm`);
					}
				}

				if (detailedInfo.distributions) {
					const distributions = Array.isArray(detailedInfo.distributions) 
						? detailedInfo.distributions.map((d: any) => d.name).join(', ')
						: detailedInfo.distributions;
					if (distributions) {
						notes.push(`Native to: ${distributions}`);
					}
				}

				if (notes.length > 0) {
					result.growingNotes = notes.join('. ');
				}
			}

			console.log('[Trefle Debug] Returning result:', result.name);
			return result;
		} else {
			console.log('[Trefle Debug] No results found in Trefle, trying web search...');
		}
	} catch (error: any) {
		console.error('[Trefle Debug] Trefle API error:', error.response?.status, error.message);
		if (error.response?.status === 401) {
			console.error('[Trefle Debug] Invalid Trefle API token. Please check your TREFLE_API_TOKEN environment variable.');
		}
		console.log('[Trefle Debug] Falling back to web search...');
	}

	// Fallback: Web scraping if Trefle doesn't find results
	console.log('[Web Search] Starting web search for:', query);
	const webResult = await searchWebForPlant(query);
	if (webResult) {
		console.log('[Web Search] Found information via web scraping');
		return webResult;
	}

	// Final fallback: return basic result
	console.log('[Web Search] No information found, returning basic result');
	return {
		name: query,
		description: `Information about ${query}`
	};
}

// Web scraping fallback function
async function searchWebForPlant(query: string): Promise<PlantSearchResult | null> {
	try {
		// Try Wikipedia first
		const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
		console.log('[Web Search] Trying Wikipedia:', wikiUrl);
		
		try {
			const wikiResponse = await axios.get(wikiUrl, { 
				timeout: 10000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});
			
			const $ = cheerio.load(wikiResponse.data);
			
			// Check if it's a disambiguation page
			if ($('#disambig').length > 0) {
				console.log('[Web Search] Wikipedia disambiguation page, skipping');
			} else {
				// Extract information from Wikipedia
				const result: PlantSearchResult = {
					name: query,
					sourceUrl: wikiUrl
				};

				// Get description from first paragraph
				const firstParagraph = $('div.mw-parser-output > p').first().text().trim();
				if (firstParagraph && firstParagraph.length > 50) {
					result.description = firstParagraph.substring(0, 500);
				}

				// Get scientific name from infobox
				const scientificName = $('td:contains("Scientific classification")').parent().find('td').eq(1).text().trim() ||
					$('.infobox tr:contains("Species:") td').last().text().trim() ||
					$('.infobox tr:contains("Binomial name") td').last().text().trim();
				if (scientificName) {
					result.variety = scientificName;
				}

				// Get images
				const images: string[] = [];
				$('.infobox img, .thumbimage').each((_, el) => {
					const src = $(el).attr('src');
					if (src && !src.includes('icon') && !src.includes('logo')) {
						const fullUrl = src.startsWith('http') ? src : `https:${src}`;
						images.push(fullUrl);
					}
				});
				if (images.length > 0) {
					result.images = images.slice(0, 3);
				}

				// Extract growing information from sections
				const growingSection = $('h2:contains("Cultivation"), h2:contains("Growing"), h2:contains("Care")').first();
				if (growingSection.length > 0) {
					const growingText = growingSection.nextUntil('h2').text().trim();
					if (growingText) {
						result.growingNotes = growingText.substring(0, 1000);
					}
				}

				if (result.description || result.variety || result.images) {
					console.log('[Web Search] Successfully extracted from Wikipedia');
					return result;
				}
			}
		} catch (wikiError: any) {
			console.log('[Web Search] Wikipedia error:', wikiError.response?.status || wikiError.message);
		}

		// Try gardening websites
		const gardeningSites = [
			`https://www.gardeningknowhow.com/search?q=${encodeURIComponent(query)}`,
			`https://www.almanac.com/search?q=${encodeURIComponent(query)}`
		];

		for (const siteUrl of gardeningSites) {
			try {
				console.log('[Web Search] Trying:', siteUrl);
				const response = await axios.get(siteUrl, {
					timeout: 10000,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
					}
				});

				const $ = cheerio.load(response.data);
				
				// Look for plant information
				const result: PlantSearchResult = {
					name: query,
					sourceUrl: siteUrl
				};

				// Try to find description
				const description = $('meta[name="description"]').attr('content') ||
					$('article p, .content p, .post-content p').first().text().trim();
				if (description && description.length > 50) {
					result.description = description.substring(0, 500);
				}

				// Try to find images
				const images: string[] = [];
				$('img[src*="plant"], img[alt*="' + query + '"]').each((_, el) => {
					const src = $(el).attr('src');
					if (src && !src.includes('icon') && !src.includes('logo')) {
						const fullUrl = src.startsWith('http') ? src : new URL(src, siteUrl).href;
						images.push(fullUrl);
					}
				});
				if (images.length > 0) {
					result.images = images.slice(0, 3);
				}

				if (result.description || result.images) {
					console.log('[Web Search] Successfully extracted from:', siteUrl);
					return result;
				}
			} catch (siteError: any) {
				console.log('[Web Search] Site error:', siteError.response?.status || siteError.message);
			}
		}

		return null;
	} catch (error: any) {
		console.error('[Web Search] General error:', error.message);
		return null;
	}
}

export async function downloadAndSavePlantImage(
	imageUrl: string,
	plantId: number
): Promise<string | null> {
	try {
		const webDir = join(process.cwd(), 'static', 'plant-images', 'web');
		if (!existsSync(webDir)) {
			await mkdir(webDir, { recursive: true });
		}

		// Download image
		const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
		const buffer = Buffer.from(response.data);

		// Generate filename
		const timestamp = Date.now();
		const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
		const filename = `${plantId}_web_${timestamp}.${ext}`;
		const filepath = join(webDir, filename);
		const relativePath = `/api/serve-image/plant-images/web/${filename}`;

		// Resize and save
		await sharp(buffer)
			.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 85 })
			.toFile(filepath);

		// Save to database
		await queries.addPlantImage({
			plantId,
			imagePath: relativePath,
			isWebImage: true,
			sourceUrl: imageUrl
		});

		return relativePath;
	} catch (error) {
		console.error('Image download error:', error);
		return null;
	}
}
