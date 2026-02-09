import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import * as queries from '$lib/db/queries';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Invalid journal entry ID');

	const images = await queries.getJournalImages(id);
	return json(images);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const entryId = parseInt(params.id);
	if (isNaN(entryId)) throw error(400, 'Invalid journal entry ID');

	try {
		const formData = await request.formData();
		const file = formData.get('image') as File;
		const caption = formData.get('caption') as string | null;
		const bedId = formData.get('bedId') as string | null;
		const zone = formData.get('zone') as string | null;

		if (!file) throw error(400, 'Missing image file');

		const uploadsDir = join(process.cwd(), 'static', 'journal-images', 'uploads');
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		const timestamp = Date.now();
		const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
		const filename = `journal_${entryId}_${timestamp}_${safeName}`;
		const filepath = join(uploadsDir, filename);
		const relativePath = `/journal-images/uploads/${filename}`;

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await sharp(buffer)
			.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 85 })
			.toFile(filepath);

		const image = await queries.addJournalImage({
			journalEntryId: entryId,
			imagePath: relativePath,
			caption: caption || undefined,
			bedId: bedId ? parseInt(bedId) : undefined,
			zone: zone || undefined
		});

		return json(image, { status: 201 });
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error('Journal image upload error:', err);
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
};
