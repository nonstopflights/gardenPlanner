import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid season ID');
	}
	try {
		const { fromSeasonId } = await request.json();
		await queries.copyBedLayoutsToSeason(fromSeasonId, id);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to copy bed layouts' }, { status: 500 });
	}
};
