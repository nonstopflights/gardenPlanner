import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ url }) => {
	const seasonId = url.searchParams.get('seasonId');
	const parsedSeasonId = seasonId ? parseInt(seasonId) : undefined;
	const activities = await queries.getAllPlantingActivities(parsedSeasonId);
	return json(activities);
};
