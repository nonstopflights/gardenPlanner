import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import sharp from 'sharp';
import * as queries from '$lib/db/queries';
import { ensureImageDir, sanitizeUploadFilename } from '$lib/server/imageStorage';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('image') as File;
		const plantId = parseInt(formData.get('plantId') as string);
		const caption = formData.get('caption') as string | null;
		const takenAt = formData.get('takenAt') as string | null;
		const bedId = formData.get('bedId') as string | null;
		const zone = formData.get('zone') as string | null;
		const seasonId = formData.get('seasonId') as string | null;

		if (!file || isNaN(plantId)) {
			throw error(400, 'Missing file or plantId');
		}

		const uploadsDir = await ensureImageDir('plant-images', 'uploads');

		const timestamp = Date.now();
		const safeName = sanitizeUploadFilename(file.name || 'upload.jpg') || 'upload.jpg';
		const filename = `${plantId}_${timestamp}_${safeName}`;
		const filepath = join(uploadsDir, filename);
		const relativePath = `/api/serve-image/plant-images/uploads/${filename}`;

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await sharp(buffer)
			.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 85 })
			.toFile(filepath);

		const image = await queries.addPlantImage({
			plantId,
			imagePath: relativePath,
			isWebImage: false,
			caption: caption || undefined,
			takenAt: takenAt || undefined,
			bedId: bedId ? parseInt(bedId) : undefined,
			zone: zone || undefined,
			seasonId: seasonId ? parseInt(seasonId) : undefined
		});

		return json(image, { status: 201 });
	} catch (err) {
		console.error('Image upload error:', err);
		const message = err instanceof Error ? err.message : 'Failed to upload image';
		return json({ error: message }, { status: 500 });
	}
};
