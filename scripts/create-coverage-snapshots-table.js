#!/usr/bin/env node
/**
 * create-coverage-snapshots-table.js
 *
 * Creates the coverage_snapshots table for tracking daily catalog coverage metrics.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-coverage-snapshots-table.js
 */

import pg from 'pg';
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function createTable() {
  const client = await pool.connect();

  try {
    console.log('=== CREATE COVERAGE_SNAPSHOTS TABLE ===');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('');

    // Check if table already exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'coverage_snapshots'
      )
    `);

    if (tableExists.rows[0].exists) {
      console.log('⚠️ Table coverage_snapshots already exists');
      console.log('');

      // Show existing records
      const count = await client.query('SELECT COUNT(*) FROM coverage_snapshots');
      console.log(`Existing snapshots: ${count.rows[0].count}`);

      return;
    }

    console.log('📊 Creating coverage_snapshots table...');
    console.log('');

    const createTableSQL = `
      CREATE TABLE coverage_snapshots (
        snapshot_date DATE PRIMARY KEY,

        -- Total catalog size
        total_catalog INTEGER NOT NULL,

        -- Core features (8 total)
        has_title INTEGER NOT NULL,
        has_year INTEGER NOT NULL,
        has_poster INTEGER NOT NULL,
        has_slug INTEGER NOT NULL,
        has_trailer INTEGER NOT NULL,
        has_contributors INTEGER NOT NULL,
        has_whywatch INTEGER NOT NULL,
        has_moreideas INTEGER NOT NULL,

        -- Completeness tiers
        complete_all_8 INTEGER NOT NULL,
        complete_7_of_8 INTEGER NOT NULL,
        complete_6_of_8 INTEGER NOT NULL,

        -- External coverage (recommended films)
        recommended_total INTEGER,
        recommended_in_catalog INTEGER,
        recommended_missing INTEGER,
        recommended_high_priority INTEGER,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await client.query(createTableSQL);

    console.log('✅ Table created successfully');
    console.log('');

    // Create index on snapshot_date for fast lookups
    console.log('📊 Creating index...');
    await client.query(`
      CREATE INDEX idx_coverage_snapshots_date
      ON coverage_snapshots(snapshot_date DESC)
    `);

    console.log('✅ Index created successfully');
    console.log('');

    console.log('=== SCHEMA ===');
    console.log('');
    console.log('Table: coverage_snapshots');
    console.log('');
    console.log('Columns:');
    console.log('  snapshot_date (DATE, PK)');
    console.log('  total_catalog (INTEGER)');
    console.log('  has_title (INTEGER)');
    console.log('  has_year (INTEGER)');
    console.log('  has_poster (INTEGER)');
    console.log('  has_slug (INTEGER)');
    console.log('  has_trailer (INTEGER)');
    console.log('  has_contributors (INTEGER)');
    console.log('  has_whywatch (INTEGER)');
    console.log('  has_moreideas (INTEGER)');
    console.log('  complete_all_8 (INTEGER)');
    console.log('  complete_7_of_8 (INTEGER)');
    console.log('  complete_6_of_8 (INTEGER)');
    console.log('  recommended_total (INTEGER)');
    console.log('  recommended_in_catalog (INTEGER)');
    console.log('  recommended_missing (INTEGER)');
    console.log('  recommended_high_priority (INTEGER)');
    console.log('  created_at (TIMESTAMP)');
    console.log('');
    console.log('✅ Setup complete!');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
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
