import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ url }) => {
	const category = url.searchParams.get('category') as 'past' | 'want' | 'current' | undefined;
	const plants = await queries.getAllPlants(category);
	return json(plants);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const plant = await queries.createPlant(data);
		return json(plant, { status: 201 });
	} catch (error) {
		return json({ error: 'Failed to create plant' }, { status: 500 });
	}
};
