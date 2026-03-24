import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { existsSync, readdirSync, statSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execFileAsync = promisify(execFile);

const COOKIE_NAME = 'openai_model';

const ALLOWED_MODELS = [
	'gpt-5.4-mini',
	'gpt-5-mini',
	'gpt-5.2-chat-latest',
	'gpt-4o-mini',
	'gpt-4o',
	'gpt-4.1'
] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function normalizeModel(value: unknown): AllowedModel {
	if (typeof value !== 'string') return 'gpt-5.4-mini';
	return (ALLOWED_MODELS as readonly string[]).includes(value) ? (value as AllowedModel) : 'gpt-5.4-mini';
}

function loadBackups() {
	const backupDir = join(process.cwd(), 'backup');
	if (!existsSync(backupDir)) return [];

	return readdirSync(backupDir)
		.filter((f) => f.endsWith('.tar.gz'))
		.map((f) => {
			const fullPath = join(backupDir, f);
			const stat = statSync(fullPath);
			return {
				name: f,
				size: stat.size,
				created: stat.mtime.toISOString()
			};
		})
		.sort((a, b) => b.created.localeCompare(a.created));
}

export const load: PageServerLoad = async ({ cookies }) => {
	return {
		model: normalizeModel(cookies.get(COOKIE_NAME)),
		allowedModels: ALLOWED_MODELS,
		backups: loadBackups(),
		backupDir: join(process.cwd(), 'backup')
	};
};

export const actions: Actions = {
	setModel: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const model = normalizeModel(form.get('model'));

		cookies.set(COOKIE_NAME, model, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});

		throw redirect(303, '/settings?saved=1');
	},

	backup: async () => {
		const scriptPath = join(process.cwd(), 'backup', 'backup.sh');

		if (!existsSync(scriptPath)) {
			return { backupError: 'Backup script not found.' };
		}

		try {
			await execFileAsync(scriptPath, [], {
				cwd: process.cwd(),
				timeout: 60000
			});
		} catch (error: any) {
			return { backupError: error.message ?? 'Backup failed.' };
		}

		throw redirect(303, '/settings?backed-up=1');
	}
};
