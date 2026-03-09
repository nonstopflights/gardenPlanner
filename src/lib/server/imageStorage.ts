import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const runtimeImageRoot = process.env.IMAGE_STORAGE_DIR || join(process.cwd(), 'database', 'images');
const legacyStaticRoot = join(process.cwd(), 'static');

export async function ensureImageDir(...segments: string[]) {
	const dir = join(runtimeImageRoot, ...segments);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	return dir;
}

export function getRuntimeImageRoot() {
	return runtimeImageRoot;
}

export function getLegacyStaticRoot() {
	return legacyStaticRoot;
}

export function sanitizeUploadFilename(filename: string): string {
	return filename
		.normalize('NFKD')
		.replace(/[^a-zA-Z0-9._-]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
}
