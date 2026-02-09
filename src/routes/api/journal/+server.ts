import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ url }) => {
	const seasonId = url.searchParams.get('seasonId');
	const search = url.searchParams.get('search');
	const parsedSeasonId = seasonId ? parseInt(seasonId) : undefined;

	if (search) {
		const entries = await queries.searchJournalEntries(search, parsedSeasonId);
		return json(entries);
	}

	const entries = await queries.getAllJournalEntries(parsedSeasonId);
	return json(entries);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const entry = await queries.createJournalEntry(data);
		return json(entry, { status: 201 });
	} catch (err) {
		return json({ error: 'Failed to create journal entry' }, { status: 500 });
	}
};
