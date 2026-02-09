import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const POST: RequestHandler = async ({ params, request }) => {
	const bedId = parseInt(params.id);
	if (isNaN(bedId)) {
		throw error(400, 'Invalid bed ID');
	}
	try {
		const { plantId, zone, seasonId, plantedDate, posX, posY } = await request.json();
		const bedPlant = await queries.addPlantToBed(
			bedId,
			plantId,
			zone ?? 'custom',
			seasonId,
			plantedDate,
			posX ?? 50,
			posY ?? 50
		);
		return json(bedPlant, { status: 201 });
	} catch (err) {
		return json({ error: 'Failed to add plant to bed' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { bedPlantId, posX, posY } = await request.json();
		if (!bedPlantId || posX == null || posY == null) {
			throw error(400, 'bedPlantId, posX, and posY are required');
		}
		const result = await queries.updateBedPlantPosition(bedPlantId, posX, posY);
		return json(result ?? { success: true });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		return json({ error: 'Failed to update plant position' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const bedId = parseInt(params.id);
	if (isNaN(bedId)) {
		throw error(400, 'Invalid bed ID');
	}
	try {
		const data = await request.json();
		if (data.bedPlantId) {
			await queries.removeBedPlant(data.bedPlantId);
		} else {
			// Backward compat: remove by plantId + zone
			await queries.removePlantFromBed(bedId, data.plantId, data.zone);
		}
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Failed to remove plant from bed' }, { status: 500 });
	}
};
