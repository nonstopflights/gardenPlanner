import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

// import type { SeedProductData } from './seedSiteScraper';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
	if (!OPENAI_API_KEY) return null;
	if (!client) {
		client = new OpenAI({ apiKey: OPENAI_API_KEY });
	}
	return client;
}

export type OpenAIModelId = 'gpt-5-mini' | 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';

function normalizeModelId(value: unknown): OpenAIModelId {
	if (typeof value !== 'string') return 'gpt-5-mini';
	if (value === 'gpt-5-mini') return value;
	if (value === 'gpt-4o-mini') return value;
	if (value === 'gpt-4o') return value;
	if (value === 'gpt-4.1') return value;
	return 'gpt-5-mini';
}

export interface PlantLookupResult {
	name: string;
	variety: string | null;
	category: 'want' | 'current' | 'past';
	plantType: string | null;
	plantingDate: string | null;
	harvestDate: string | null;
	daysToMaturity: number | null;
	plantingSeason: string | null;
	startIndoorsWeeks: number | null;
	transplantWeeks: number | null;
	directSowWeeks: number | null;
	spacing: string | null;
	sunRequirements: string | null;
	waterNeeds: string | null;
	companionPlants: string | null;
	matureHeight: string | null;
	growingNotes: string | null;
	harvestingNotes: string | null;
	seedSource: string | null;
	seedSourceUrl: string | null;
	seedCost: number | null;
}

export const PLANT_TYPES = [
	'Tomato', 'Pepper', 'Onion', 'Squash', 'Bean', 'Pea', 'Lettuce', 'Greens',
	'Herb', 'Flower', 'Root Vegetable', 'Brassica', 'Cucumber', 'Melon',
	'Corn', 'Berry', 'Fruit Tree', 'Other'
] as const;

const PLANT_JSON_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'name',
		'variety',
		'category',
		'plant_type',
		'planting_season',
		'planting_schedule',
		'growing_details',
		'seed_info'
	],
	properties: {
		name: { type: 'string' },
		variety: { type: 'string' },
		category: {
			type: 'string',
			enum: ['Want to Plant', 'Planted', 'Harvested', 'Archived']
		},
		plant_type: {
			type: 'string',
			enum: ['Tomato', 'Pepper', 'Onion', 'Squash', 'Bean', 'Pea', 'Lettuce', 'Greens', 'Herb', 'Flower', 'Root Vegetable', 'Brassica', 'Cucumber', 'Melon', 'Corn', 'Berry', 'Fruit Tree', 'Other'],
			description: 'The general type/category of this plant'
		},
		planting_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
		harvest_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
		days_to_maturity: { type: ['integer', 'null'], minimum: 1 },
		planting_season: { type: 'string' },
		planting_schedule: {
			type: 'object',
			additionalProperties: false,
			required: [
				'start_indoors_weeks_before_last_frost',
				'transplant_outdoors_weeks_after_last_frost',
				'direct_sow_weeks_after_last_frost',
				'suggested_start_indoors_date_range',
				'suggested_transplant_date_range',
				'suggested_direct_sow_date_range'
			],
			properties: {
				start_indoors_weeks_before_last_frost: { type: ['integer', 'null'], minimum: 0 },
				transplant_outdoors_weeks_after_last_frost: { type: ['integer', 'null'], minimum: 0 },
				direct_sow_weeks_after_last_frost: { type: ['integer', 'null'], minimum: 0 },
				suggested_start_indoors_date_range: {
					type: ['object', 'null'],
					additionalProperties: false,
					required: ['start', 'end'],
					properties: {
						start: { type: 'string', description: 'YYYY-MM-DD' },
						end: { type: 'string', description: 'YYYY-MM-DD' }
					}
				},
				suggested_transplant_date_range: {
					type: ['object', 'null'],
					additionalProperties: false,
					required: ['start', 'end'],
					properties: {
						start: { type: 'string', description: 'YYYY-MM-DD' },
						end: { type: 'string', description: 'YYYY-MM-DD' }
					}
				},
				suggested_direct_sow_date_range: {
					type: ['object', 'null'],
					additionalProperties: false,
					required: ['start', 'end'],
					properties: {
						start: { type: 'string', description: 'YYYY-MM-DD' },
						end: { type: 'string', description: 'YYYY-MM-DD' }
					}
				}
			}
		},
		growing_details: {
			type: 'object',
			additionalProperties: false,
			required: ['spacing', 'sun_requirements', 'water_needs', 'companion_plants', 'mature_height', 'growing_notes', 'harvesting_notes'],
			properties: {
				spacing: { type: ['string', 'null'] },
				sun_requirements: { type: ['string', 'null'] },
				water_needs: { type: ['string', 'null'] },
				companion_plants: { type: 'array', items: { type: 'string' } },
				mature_height: { type: ['string', 'null'], description: 'e.g. "4-6 feet", "12-18 inches"' },
				growing_notes: { type: ['string', 'null'], description: 'Brief cultivation tips, soil preferences, fertilizing advice, pest/disease notes' },
				harvesting_notes: { type: ['string', 'null'], description: 'When and how to harvest, signs of ripeness, storage tips' }
			}
		},
		seed_info: {
			type: 'object',
			additionalProperties: false,
			required: ['seed_source', 'seed_source_url', 'seed_cost'],
			properties: {
				seed_source: { type: ['string', 'null'] },
				seed_source_url: { type: ['string', 'null'] },
				seed_cost: { type: ['number', 'null'], minimum: 0 }
			}
		}
	}
};

const SYSTEM_MESSAGE = `You are a gardening data assistant specializing in home vegetable and flower gardening.
Return ONLY valid JSON that matches the provided JSON Schema exactly.
Do not include markdown, comments, trailing commas, or additional keys.
If a field is truly unknown, use null (not an empty string).
Use the user's location and frost dates to compute all suggested planting dates and date ranges.
Prefer common, broadly-correct horticultural guidance when variety-specific details are unknown.
Always try to provide values for days_to_maturity, spacing, mature_height, sun_requirements, water_needs, companion_plants, growing_notes, harvesting_notes, and the planting schedule — these are rarely truly unknown for common garden plants.
For growing_notes, include practical cultivation tips like soil preferences, fertilizing, common pests/diseases, and care advice.
For harvesting_notes, include when to harvest, signs of ripeness, how to pick, and storage tips.
For planting_season use "Spring", "Fall", or "Spring and Fall".
For category always return "Want to Plant".`;

export async function lookupPlantData(
	query: string,
	model?: OpenAIModelId
): Promise<PlantLookupResult | null> {
	const openai = getClient();
	if (!openai) return null;

	try {
		const modelId = normalizeModelId(model);
		const userMessage = `Create an import-ready plant record for my garden planner app.

Grower context:
- Location: Lancaster, PA
- USDA Hardiness Zone: 7a / 7b
- Average last spring frost date: April 28
- Average first fall frost date: October 11
- Current year: 2026

Plant to look up: ${query}

Fill in ALL fields you can with accurate horticultural data for this plant.
Use the frost dates above to calculate suggested_start_indoors_date_range, suggested_transplant_date_range, and suggested_direct_sow_date_range as concrete YYYY-MM-DD dates for the 2026 growing season.
For seed_source, suggest a reputable online seed company that sells this plant if known.

Return JSON matching this schema:
${JSON.stringify(PLANT_JSON_SCHEMA, null, 2)}`;

		const response = await openai.chat.completions.create({
			model: modelId,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: SYSTEM_MESSAGE },
				{ role: 'user', content: userMessage }
			],
			temperature: 0.3,
			max_tokens: 2000
		});

		const content = response.choices[0]?.message?.content;
		if (!content) return null;

		const data = JSON.parse(content);
		console.log('[OpenAI] Raw response:', JSON.stringify(data, null, 2));

		// Map category from ChatGPT enum to DB enum
		const categoryMap: Record<string, 'want' | 'current' | 'past'> = {
			'Want to Plant': 'want',
			'Planted': 'current',
			'Harvested': 'past',
			'Archived': 'past'
		};

		// Map planting_season to DB enum
		function mapSeason(season: string | null): string | null {
			if (!season) return null;
			const lower = season.toLowerCase();
			if (lower.includes('spring') && lower.includes('fall')) return 'both';
			if (lower.includes('spring')) return 'spring';
			if (lower.includes('fall')) return 'fall';
			return lower;
		}

		const result: PlantLookupResult = {
			name: data.name || query,
			variety: data.variety || null,
			category: categoryMap[data.category] || 'want',
			plantType: data.plant_type || null,
			plantingDate: data.planting_date || null,
			harvestDate: data.harvest_date || null,
			daysToMaturity: typeof data.days_to_maturity === 'number' ? data.days_to_maturity : null,
			plantingSeason: mapSeason(data.planting_season),
			startIndoorsWeeks:
				typeof data.planting_schedule?.start_indoors_weeks_before_last_frost === 'number'
					? data.planting_schedule.start_indoors_weeks_before_last_frost
					: null,
			transplantWeeks:
				typeof data.planting_schedule?.transplant_outdoors_weeks_after_last_frost === 'number'
					? data.planting_schedule.transplant_outdoors_weeks_after_last_frost
					: null,
			directSowWeeks:
				typeof data.planting_schedule?.direct_sow_weeks_after_last_frost === 'number'
					? data.planting_schedule.direct_sow_weeks_after_last_frost
					: null,
			spacing: data.growing_details?.spacing || null,
			sunRequirements: data.growing_details?.sun_requirements || null,
			waterNeeds: data.growing_details?.water_needs || null,
			companionPlants: Array.isArray(data.growing_details?.companion_plants)
				? data.growing_details.companion_plants.join(', ')
				: null,
			matureHeight: data.growing_details?.mature_height || null,
			growingNotes: data.growing_details?.growing_notes || null,
			harvestingNotes: data.growing_details?.harvesting_notes || null,
			seedSource: data.seed_info?.seed_source || null,
			seedSourceUrl: data.seed_info?.seed_source_url || null,
			seedCost: typeof data.seed_info?.seed_cost === 'number' ? data.seed_info.seed_cost : null
		};

		console.log('[OpenAI] Mapped result:', JSON.stringify(result, null, 2));
		return result;
	} catch (error) {
		console.error('[OpenAI] Plant data lookup failed:', error);
		return null;
	}
}

export async function classifyPlantTypes(
	plantsToClassify: { id: number; name: string; variety: string | null }[],
	model?: OpenAIModelId
): Promise<Record<number, string>> {
	const openai = getClient();
	if (!openai || plantsToClassify.length === 0) return {};

	try {
		const modelId = normalizeModelId(model);
		const plantList = plantsToClassify
			.map((p) => `${p.id}: ${p.name}${p.variety ? ` (${p.variety})` : ''}`)
			.join('\n');

		const response = await openai.chat.completions.create({
			model: modelId,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content: `You are a plant classification assistant. Given a list of plant names, classify each into exactly one of these types: ${PLANT_TYPES.join(', ')}.
Return ONLY a JSON object mapping each plant ID to its type string. Example: {"1": "Tomato", "2": "Flower"}`
				},
				{
					role: 'user',
					content: `Classify these plants:\n${plantList}`
				}
			],
			temperature: 0.1,
			max_tokens: 2000
		});

		const content = response.choices[0]?.message?.content;
		if (!content) return {};

		const data = JSON.parse(content);
		const result: Record<number, string> = {};
		for (const [idStr, type] of Object.entries(data)) {
			const id = parseInt(idStr);
			if (!isNaN(id) && typeof type === 'string') {
				result[id] = type;
			}
		}

		console.log('[OpenAI] Plant classification result:', JSON.stringify(result, null, 2));
		return result;
	} catch (error) {
		console.error('[OpenAI] Plant classification failed:', error);
		return {};
	}
}

// --- Old enrichment function (commented out) ---
// export async function enrichPlantData(
// 	plantName: string,
// 	description?: string
// ): Promise<Partial<SeedProductData>> {
// 	const openai = getClient();
// 	if (!openai) return {};
//
// 	try {
// 		const descPart = description ? `\nProduct description: "${description}"` : '';
//
// 		const response = await openai.chat.completions.create({
// 			model: 'gpt-5.2',
// 			response_format: { type: 'json_object' },
// 			messages: [
// 				{
// 					role: 'system',
// 					content:
// 						'You are a knowledgeable gardening expert. Return only a JSON object with growing information for the given plant. Use null for any values you are not confident about.'
// 				},
// 				{
// 					role: 'user',
// 					content: `Provide growing details for: "${plantName}"${descPart}
//
// Return a JSON object with these fields:
// {
//   "daysToMaturity": number or null (days from transplant/sowing to harvest),
//   "spacing": "string" or null (e.g. "18-24 inches"),
//   "sunRequirements": "string" or null (e.g. "Full Sun"),
//   "waterNeeds": "string" or null (e.g. "Regular, 1-2 inches per week"),
//   "growingNotes": "string" or null (brief cultivation tips),
//   "harvestingNotes": "string" or null (when and how to harvest),
//   "startIndoorsWeeks": number or null (weeks before last frost to start indoors),
//   "directSowWeeks": number or null (weeks before or after last frost to direct sow, negative means before frost)
// }`
// 				}
// 			],
// 			temperature: 0.3,
// 			max_tokens: 500
// 		});
//
// 		const content = response.choices[0]?.message?.content;
// 		if (!content) return {};
//
// 		const data = JSON.parse(content);
// 		const result: Partial<SeedProductData> = {};
//
// 		if (typeof data.daysToMaturity === 'number') result.daysToMaturity = data.daysToMaturity;
// 		if (typeof data.spacing === 'string') result.spacing = data.spacing;
// 		if (typeof data.sunRequirements === 'string') result.sunRequirements = data.sunRequirements;
// 		if (typeof data.waterNeeds === 'string') result.waterNeeds = data.waterNeeds;
// 		if (typeof data.growingNotes === 'string') result.growingNotes = data.growingNotes;
// 		if (typeof data.harvestingNotes === 'string') result.harvestingNotes = data.harvestingNotes;
// 		if (typeof data.startIndoorsWeeks === 'number')
// 			result.startIndoorsWeeks = data.startIndoorsWeeks;
// 		if (typeof data.directSowWeeks === 'number') result.directSowWeeks = data.directSowWeeks;
//
// 		return result;
// 	} catch (error) {
// 		console.error('[OpenAI] Plant data enrichment failed:', error);
// 		return {};
// 	}
// }
