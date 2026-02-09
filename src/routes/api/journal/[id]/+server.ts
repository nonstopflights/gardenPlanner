import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid journal entry ID');
	}
	const entry = await queries.getJournalEntryById(id);
	if (!entry) {
		throw error(404, 'Journal entry not found');
	}
	return json(entry);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid journal entry ID');
	}
	try {
		const data = await request.json();
		const entry = await queries.updateJournalEntry(id, data);
		if (!entry) {
			throw error(404, 'Journal entry not found');
		}
		return json(entry);
	} catch (err) {
		if (err instanceof Error && err.message.includes('404')) {
			throw err;
		}
		return json({ error: 'Failed to update journal entry' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid journal entry ID');
	}
	try {
		await queries.deleteJournalEntry(id);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to delete journal entry' }, { status: 500 });
	}
};
