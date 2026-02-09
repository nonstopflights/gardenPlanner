import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	const plant = await queries.getPlantById(id);
	if (!plant) {
		throw error(404, 'Plant not found');
	}
	return json(plant);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	try {
		const data = await request.json();
		const plant = await queries.updatePlant(id, data);
		if (!plant) {
			throw error(404, 'Plant not found');
		}
		return json(plant);
	} catch (err) {
		if (err instanceof Error && err.message.includes('404')) {
			throw err;
		}
		return json({ error: 'Failed to update plant' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid plant ID');
	}
	try {
		await queries.deletePlant(id);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to delete plant' }, { status: 500 });
	}
};
