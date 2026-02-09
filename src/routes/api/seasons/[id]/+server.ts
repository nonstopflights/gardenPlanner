import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid season ID');
	}
	const season = await queries.getSeasonById(id);
	if (!season) {
		throw error(404, 'Season not found');
	}
	return json(season);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid season ID');
	}
	try {
		const data = await request.json();
		const season = await queries.updateSeason(id, data);
		return json(season);
	} catch (err) {
		return json({ error: 'Failed to update season' }, { status: 500 });
	}
};
