#!/usr/bin/env node
/**
 * fix-moreideas-join.js
 *
 * Fixes the MoreIdeas join issue by populating movie_id from tmdb_id matches.
 * This recovers 99.97% of MoreIdeas records (32,019 out of 32,028).
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-moreideas-join.js --execute
 *
 * Without --execute flag, runs in DRY RUN mode (shows what would be updated)
 */

import pg from 'pg';
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const execute = process.argv.includes('--execute');

async function fix() {
  const client = await pool.connect();

  try {
    console.log('=== MOREIDEAS JOIN FIX ===');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Mode: ${execute ? '🔴 EXECUTE' : '🟡 DRY RUN'}`);
    console.log('');

    // Step 1: Show current state
    console.log('📊 STEP 1: Current state');
    const beforeStats = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN movie_id IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN movie_id IS NOT NULL THEN 1 END) as populated_count
      FROM more_ideas
    `);

    const before = beforeStats.rows[0];
    console.log(`Total MoreIdeas records: ${parseInt(before.total).toLocaleString()}`);
    console.log(`  NULL movie_id: ${parseInt(before.null_count).toLocaleString()}`);
    console.log(`  Populated movie_id: ${parseInt(before.populated_count).toLocaleString()}`);
    console.log('');

    // Step 2: Preview what will be updated
    console.log('📊 STEP 2: Preview update');
    const preview = await client.query(`
      SELECT COUNT(*) as will_update
      FROM more_ideas mi
      INNER JOIN movies m ON mi.tmdb_id = m.tmdb_id
      WHERE mi.movie_id IS NULL
    `);

    const willUpdate = parseInt(preview.rows[0].will_update);
    console.log(`Will update: ${willUpdate.toLocaleString()} records`);
    console.log('');

    if (!execute) {
      console.log('🟡 DRY RUN MODE - No changes will be made');
      console.log('');
      console.log('To execute the fix, run:');
      console.log('  node --env-file=.env.local scripts/fix-moreideas-join.js --execute');
      console.log('');

      // Show sample of what would be updated
      const samples = await client.query(`
        SELECT
          mi.id as moreideas_id,
          mi.tmdb_id,
          mi.movie_id as old_movie_id,
          m.id as new_movie_id,
          m.title,
          m.year
        FROM more_ideas mi
        INNER JOIN movies m ON mi.tmdb_id = m.tmdb_id
        WHERE mi.movie_id IS NULL
        LIMIT 10
      `);

      console.log('Sample of records that would be updated:');
      console.log('MI_ID  | TMDB_ID | Old movie_id | New movie_id                        | Title            | Year');
      console.log('-------|---------|--------------|-------------------------------------|------------------|-----');
      samples.rows.forEach(row => {
        const title = row.title ? row.title.substring(0, 15) : 'NULL';
        const oldId = row.old_movie_id ? row.old_movie_id.substring(0, 8) + '...' : 'NULL';
        const newId = row.new_movie_id.substring(0, 8) + '...';
        console.log(
          `${String(row.moreideas_id).padStart(6)} | ${String(row.tmdb_id).padStart(7)} | ${oldId.padEnd(12)} | ${newId.padEnd(35)} | ${title.padEnd(16)} | ${row.year}`
        );
      });

      return;
    }

    // Step 3: Execute the fix
    console.log('🔴 EXECUTING FIX...');
    console.log('');

    const startTime = Date.now();

    const result = await client.query(`
      UPDATE more_ideas mi
      SET movie_id = m.id
      FROM movies m
      WHERE mi.tmdb_id = m.tmdb_id
        AND mi.movie_id IS NULL
    `);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Updated ${result.rowCount.toLocaleString()} records in ${duration}s`);
    console.log('');

    // Step 4: Verify the fix
    console.log('📊 STEP 4: Verify fix');
    const afterStats = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN movie_id IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN movie_id IS NOT NULL THEN 1 END) as populated_count
      FROM more_ideas
    `);

    const after = afterStats.rows[0];
    console.log(`Total MoreIdeas records: ${parseInt(after.total).toLocaleString()}`);
    console.log(`  NULL movie_id: ${parseInt(after.null_count).toLocaleString()}`);
    console.log(`  Populated movie_id: ${parseInt(after.populated_count).toLocaleString()}`);
    console.log('');

    // Step 5: Test join
    console.log('📊 STEP 5: Test join');
    const joinTest = await client.query(`
      SELECT COUNT(DISTINCT m.id) as movies_with_moreideas
      FROM movies m
      INNER JOIN more_ideas mi ON mi.movie_id = m.id
    `);

    const moviesWithMoreIdeas = parseInt(joinTest.rows[0].movies_with_moreideas);
    console.log(`Movies with MoreIdeas: ${moviesWithMoreIdeas.toLocaleString()}`);
    console.log('');

    // Summary
    console.log('=== FIX SUMMARY ===');
    console.log('');
    console.log(`✅ Fixed ${result.rowCount.toLocaleString()} MoreIdeas records`);
    console.log(`✅ ${moviesWithMoreIdeas.toLocaleString()} movies now have MoreIdeas`);

    if (parseInt(after.null_count) > 0) {
      console.log('');
      console.log(`⚠️ ${parseInt(after.null_count).toLocaleString()} records still have NULL movie_id`);
      console.log('   (These are MoreIdeas for movies not in the catalog)');
    }

    console.log('');
    console.log('✅ MoreIdeas join fix complete!');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
