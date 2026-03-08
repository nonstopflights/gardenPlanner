import { json } from '@sveltejs/kit';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const backupDir = join(process.cwd(), 'backup');

export async function GET() {
	if (!existsSync(backupDir)) {
		return json({ backups: [] });
	}

	const backups = readdirSync(backupDir)
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

	return json({ backups });
}

export async function POST() {
	const scriptPath = join(process.cwd(), 'backup', 'backup.sh');

	if (!existsSync(scriptPath)) {
		return json({ success: false, error: 'Backup script not found' }, { status: 500 });
	}

	try {
		const { stdout } = await execFileAsync(scriptPath, [], {
			cwd: process.cwd(),
			timeout: 60000
		});
		return json({ success: true, output: stdout });
	} catch (error: any) {
		return json({ success: false, error: error.message }, { status: 500 });
	}
}
