import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid activity ID');
	}
	try {
		await queries.deletePlantActivity(id);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to delete activity' }, { status: 500 });
	}
};
