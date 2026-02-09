import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	const images = await queries.getPlantImages(id);
	return json(images);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	try {
		const data = await request.json();
		const image = await queries.updatePlantImage(data.imageId, {
			caption: data.caption,
			takenAt: data.takenAt,
			bedId: data.bedId ?? null,
			zone: data.zone ?? null,
			seasonId: data.seasonId ?? null
		});
		if (!image) throw error(404, 'Image not found');
		return json(image);
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		return json({ error: 'Failed to update image' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	try {
		const { imageId } = await request.json();
		await queries.deletePlantImage(imageId);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to delete image' }, { status: 500 });
	}
};
