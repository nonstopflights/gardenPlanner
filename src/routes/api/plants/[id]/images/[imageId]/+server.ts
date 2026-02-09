import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const PUT: RequestHandler = async ({ params, request }) => {
	const imageId = parseInt(params.imageId);
	if (isNaN(imageId)) {
		throw error(400, 'Invalid image ID');
	}
	try {
		const { caption, takenAt } = await request.json();
		const image = await queries.updatePlantImage(imageId, { caption, takenAt });
		if (!image) {
			throw error(404, 'Image not found');
		}
		return json(image);
	} catch (err) {
		if (err instanceof Error && err.message.includes('404')) {
			throw err;
		}
		return json({ error: 'Failed to update image' }, { status: 500 });
	}
};
