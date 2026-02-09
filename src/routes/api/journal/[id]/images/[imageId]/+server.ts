import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const PUT: RequestHandler = async ({ params, request }) => {
	const imageId = parseInt(params.imageId);
	if (isNaN(imageId)) throw error(400, 'Invalid image ID');

	try {
		const data = await request.json();
		const image = await queries.updateJournalImage(imageId, {
			caption: data.caption,
			bedId: data.bedId ?? null,
			zone: data.zone ?? null
		});
		if (!image) throw error(404, 'Image not found');
		return json(image);
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		return json({ error: 'Failed to update image' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const imageId = parseInt(params.imageId);
	if (isNaN(imageId)) throw error(400, 'Invalid image ID');

	try {
		await queries.deleteJournalImage(imageId);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to delete image' }, { status: 500 });
	}
};
