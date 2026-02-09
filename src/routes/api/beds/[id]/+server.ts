import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params, url }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid bed ID');
	}
	const seasonIdParam = url.searchParams.get('seasonId');
	const seasonId = seasonIdParam ? parseInt(seasonIdParam) : undefined;
	if (seasonIdParam && isNaN(seasonId!)) {
		throw error(400, 'Invalid season ID');
	}
	const bed = await queries.getBedWithPlants(id, seasonId);
	if (!bed) {
		throw error(404, 'Bed not found');
	}
	return json(bed);
};
