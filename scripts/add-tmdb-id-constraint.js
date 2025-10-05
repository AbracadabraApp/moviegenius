#!/usr/bin/env node

/**
 * Add NOT NULL Constraint to tmdb_id Column
 *
 * Ensures all future movies must have a TMDB ID
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addConstraint() {
  console.log('🔒 Adding NOT NULL Constraint to tmdb_id');
  console.log('========================================\n');

  try {
    // First check if any NULL values remain
    const nullCheck = await pool.query('SELECT COUNT(*) as count FROM movies WHERE tmdb_id IS NULL');
    const nullCount = parseInt(nullCheck.rows[0].count);

    if (nullCount > 0) {
      console.log(`❌ Cannot add constraint: ${nullCount} movies still have NULL tmdb_id`);
      console.log('   Run backfill-missing-tmdb-ids.js first\n');
      return;
    }

    console.log('✅ No NULL values found\n');

    // Add NOT NULL constraint
    console.log('Adding NOT NULL constraint to tmdb_id column...');
    await pool.query('ALTER TABLE movies ALTER COLUMN tmdb_id SET NOT NULL');

    console.log('✅ Constraint added successfully\n');

    // Verify
    const verify = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'movies' AND column_name = 'tmdb_id'
    `);

    console.log('Verification:');
    console.log(`  tmdb_id is_nullable: ${verify.rows[0].is_nullable}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addConstraint().catch(console.error);
