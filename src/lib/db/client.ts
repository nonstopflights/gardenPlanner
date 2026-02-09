import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbPath = join(process.cwd(), 'database', 'garden.db');

// Ensure database directory exists
const dbDir = join(process.cwd(), 'database');
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Run migrations
try {
	const migrationsFolder = join(process.cwd(), 'drizzle');
	if (existsSync(migrationsFolder)) {
		migrate(db, { migrationsFolder });
		console.log('Migrations applied successfully');
	} else {
		console.warn('Migrations folder not found. Run: npm run db:generate');
	}
} catch (error: any) {
	console.error('Migration error:', error);
	console.error('Migration error details:', error?.message, error?.stack);
	// Don't throw - allow the app to continue, but log the error
}

export { sqlite };
