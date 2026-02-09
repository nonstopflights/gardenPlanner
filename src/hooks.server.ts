import { initializeDatabase } from '$lib/db/init';

// Initialize database on server startup
initializeDatabase().catch(console.error);
