import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export const GET: RequestHandler = async ({ params }) => {
	const filePath = params.path;

	// Prevent directory traversal
	if (filePath.includes('..')) {
		throw error(400, 'Invalid path');
	}

	const fullPath = join(process.cwd(), 'static', filePath);

	if (!existsSync(fullPath)) {
		throw error(404, 'Image not found');
	}

	const data = await readFile(fullPath);
	return new Response(data, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
