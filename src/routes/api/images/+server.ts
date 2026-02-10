import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import * as queries from '$lib/db/queries';

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

		const subpath = join('plant-images', 'uploads');
		const uploadsDir = join(process.cwd(), 'static', subpath);
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		const timestamp = Date.now();
		const filename = `${plantId}_${timestamp}_${file.name}`;
		const filepath = join(uploadsDir, filename);
		const relativePath = `/plant-images/uploads/${filename}`;

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await sharp(buffer)
			.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 85 })
			.toFile(filepath);

		// Copy to build/client so adapter-node serves it immediately in production
		const buildDir = join(process.cwd(), 'build', 'client', subpath);
		if (existsSync(join(process.cwd(), 'build', 'client'))) {
			if (!existsSync(buildDir)) {
				await mkdir(buildDir, { recursive: true });
			}
			try {
				await copyFile(filepath, join(buildDir, filename));
			} catch {
				// Non-fatal — next build will pick it up from static/
			}
		}

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
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
};
