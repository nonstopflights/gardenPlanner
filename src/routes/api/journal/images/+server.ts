import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ url }) => {
	const entryIdsParam = url.searchParams.get('entryIds');
	if (!entryIdsParam) {
		throw error(400, 'entryIds query parameter required');
	}

	const entryIds = entryIdsParam
		.split(',')
		.map((id) => parseInt(id.trim()))
		.filter((id) => !isNaN(id));

	if (entryIds.length === 0) {
		return json([]);
	}

	const images = await queries.getJournalImagesForEntries(entryIds);
	return json(images);
};
