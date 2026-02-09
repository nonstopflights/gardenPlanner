import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async () => {
	try {
		const seasons = await queries.getAllSeasons();
		return json(seasons);
	} catch (err) {
		return json({ error: 'Failed to fetch seasons' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const season = await queries.createSeason(data);
		return json(season, { status: 201 });
	} catch (err) {
		return json({ error: 'Failed to create season' }, { status: 500 });
	}
};
