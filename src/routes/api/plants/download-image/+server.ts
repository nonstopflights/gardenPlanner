import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadAndSavePlantImage } from '$lib/services/plantSearch';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { imageUrl, plantId } = await request.json();

		if (!imageUrl || !plantId) {
			throw error(400, 'imageUrl and plantId are required');
		}

		const imagePath = await downloadAndSavePlantImage(imageUrl, plantId);

		if (!imagePath) {
			return json({ error: 'Failed to download image' }, { status: 500 });
		}

		return json({ imagePath });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error('Image download error:', err);
		return json({ error: 'Failed to download image' }, { status: 500 });
	}
};
