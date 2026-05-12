#!/usr/bin/env node
/**
 * create-tv-shows-table.js
 *
 * Creates a table to track TV shows (non-movies) so we don't keep querying TMDB for them
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-tv-shows-table.js
 */

import pg from 'pg';
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function createTable() {
  const client = await pool.connect();

  try {
    console.log('=== CREATE TV_SHOWS TABLE ===');
    console.log('');

    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'tv_shows'
      )
    `);

    if (tableExists.rows[0].exists) {
      console.log('⚠️ Table tv_shows already exists');
      return;
    }

    console.log('Creating tv_shows table...');

    await client.query(`
      CREATE TABLE tv_shows (
        id SERIAL PRIMARY KEY,
        tmdb_id INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL,
        original_name TEXT,
        first_air_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_tv_shows_tmdb_id ON tv_shows(tmdb_id);
      CREATE INDEX idx_tv_shows_title ON tv_shows(title);
    `);

    console.log('✅ Table created successfully');
    console.log('');
    console.log('Purpose: Track TV shows to avoid re-querying TMDB');
    console.log('Usage: When TMDB returns media_type="tv", save to this table');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
