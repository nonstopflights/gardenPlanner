import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	const webInfo = await queries.getPlantWebInfo(id);
	if (!webInfo) {
		return json(null);
	}
	return json(JSON.parse(webInfo.infoJson));
};
