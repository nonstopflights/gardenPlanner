import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const POST: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid season ID');
	}
	try {
		await queries.setActiveSeason(id);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to activate season' }, { status: 500 });
	}
};
