import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async () => {
	try {
		const beds = await queries.getAllBeds();
		return json(beds);
	} catch (err: any) {
		console.error('Error fetching beds:', err);
		console.error('Error stack:', err?.stack);
		console.error('Error message:', err?.message);
		return json({ 
			error: 'Failed to fetch beds',
			details: err?.message || String(err)
		}, { status: 500 });
	}
};
