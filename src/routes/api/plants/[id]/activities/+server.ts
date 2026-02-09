import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params, url }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	const seasonId = url.searchParams.get('seasonId');
	const parsedSeasonId = seasonId ? parseInt(seasonId) : undefined;
	const activities = await queries.getPlantActivities(id, parsedSeasonId);
	return json(activities);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	try {
		const data = await request.json();
		const activity = await queries.createPlantActivity({ ...data, plantId: id });
		return json(activity, { status: 201 });
	} catch (err) {
		return json({ error: 'Failed to create plant activity' }, { status: 500 });
	}
};
