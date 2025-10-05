// Shared database connection pool for all APIs
// Prevents connection exhaustion and improves performance

import { Pool } from 'pg';

let pool = null;

export function getPool() {
  if (!pool) {
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
    }

    pool = new Pool({
      connectionString: dbUrl,
      max: 10, // Maximum connections
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Timeout connection attempts after 2s
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  return pool;
}

// Optional: Close pool on process exit (for clean shutdowns)
process.on('SIGINT', () => {
  if (pool) {
    pool.end();
  }
});