import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params, url }) => {
	const plantId = parseInt(params.id);
	if (isNaN(plantId)) throw error(400, 'Invalid plant ID');

	const bedId = parseInt(url.searchParams.get('bedId') ?? '');
	const zone = url.searchParams.get('zone');
	const seasonId = parseInt(url.searchParams.get('seasonId') ?? '');

	if (isNaN(bedId) || !zone || isNaN(seasonId)) {
		throw error(400, 'bedId, zone, and seasonId query parameters required');
	}

	const images = await queries.getPlantImagesForSpot(plantId, bedId, zone, seasonId);
	return json(images);
};
