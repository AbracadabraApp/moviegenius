#!/usr/bin/env node
/**
 * diagnose-moreideas.js
 *
 * Diagnoses the MoreIdeas join issue to understand why 0% of movies
 * have MoreIdeas despite 32,028 records existing in the more_ideas table.
 *
 * Usage:
 *   node --env-file=.env.local scripts/diagnose-moreideas.js
 */

import pg from 'pg';
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function diagnose() {
  const client = await pool.connect();

  try {
    console.log('=== MOREIDEAS JOIN DIAGNOSTIC ===');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('');

    // 1. Total more_ideas records
    console.log('📊 STEP 1: Count more_ideas records');
    const totalMoreIdeas = await client.query('SELECT COUNT(*) FROM more_ideas');
    console.log(`Total more_ideas records: ${parseInt(totalMoreIdeas.rows[0].count).toLocaleString()}`);
    console.log('');

    // 2. Check movie_id status
    console.log('📊 STEP 2: Analyze movie_id field');
    const movieIdStatus = await client.query(`
      SELECT
        CASE
          WHEN movie_id IS NULL THEN 'NULL'
          WHEN movie_id IN (SELECT id FROM movies) THEN 'VALID'
          ELSE 'ORPHANED'
        END as status,
        COUNT(*) as count
      FROM more_ideas
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('movie_id Status Breakdown:');
    console.log('Status      | Count');
    console.log('------------|----------');
    movieIdStatus.rows.forEach(row => {
      console.log(`${row.status.padEnd(11)} | ${parseInt(row.count).toLocaleString()}`);
    });
    console.log('');

    // 3. Test tmdb_id-based join
    console.log('📊 STEP 3: Test tmdb_id-based join recovery');
    const tmdbJoinTest = await client.query(`
      SELECT COUNT(DISTINCT m.id) as recoverable_movies
      FROM movies m
      INNER JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
      WHERE m.tmdb_id IS NOT NULL
    `);

    const recoverableCount = parseInt(tmdbJoinTest.rows[0].recoverable_movies);
    console.log(`Recoverable via tmdb_id join: ${recoverableCount.toLocaleString()} movies`);
    console.log('');

    // 4. Identify unmatchable records
    console.log('📊 STEP 4: Check for unmatchable records');
    const unmatchable = await client.query(`
      SELECT COUNT(*) as unmatchable
      FROM more_ideas mi
      WHERE mi.tmdb_id NOT IN (SELECT tmdb_id FROM movies WHERE tmdb_id IS NOT NULL)
    `);

    const unmatchableCount = parseInt(unmatchable.rows[0].unmatchable);
    console.log(`Unmatchable records (tmdb_id not in movies): ${unmatchableCount.toLocaleString()}`);
    console.log('');

    // 5. Sample records for inspection
    console.log('📊 STEP 5: Sample records');
    const samples = await client.query(`
      SELECT
        mi.id,
        mi.movie_id,
        mi.tmdb_id,
        m.title,
        m.year,
        jsonb_array_length(mi.ideas) as idea_count
      FROM more_ideas mi
      LEFT JOIN movies m ON mi.movie_id = m.id
      LIMIT 5
    `);

    console.log('Sample Records (first 5):');
    console.log('ID     | movie_id                            | tmdb_id | Title            | Year | Ideas');
    console.log('-------|-------------------------------------|---------|------------------|------|------');
    samples.rows.forEach(row => {
      const movieId = row.movie_id ? row.movie_id.substring(0, 8) + '...' : 'NULL';
      const title = row.title ? row.title.substring(0, 15) : 'NULL';
      const year = row.year || 'NULL';
      console.log(
        `${String(row.id).padStart(6)} | ${movieId.padEnd(35)} | ${String(row.tmdb_id).padStart(7)} | ${title.padEnd(16)} | ${String(year).padStart(4)} | ${row.idea_count}`
      );
    });
    console.log('');

    // 6. Summary and recommendations
    console.log('=== DIAGNOSTIC SUMMARY ===');
    console.log('');

    const totalRecords = parseInt(totalMoreIdeas.rows[0].count);
    const nullCount = movieIdStatus.rows.find(r => r.status === 'NULL')?.count || 0;
    const validCount = movieIdStatus.rows.find(r => r.status === 'VALID')?.count || 0;
    const orphanedCount = movieIdStatus.rows.find(r => r.status === 'ORPHANED')?.count || 0;

    if (nullCount > totalRecords * 0.9) {
      console.log('🔴 ISSUE IDENTIFIED: Most movie_id fields are NULL');
      console.log(`   ${parseInt(nullCount).toLocaleString()} records (${((nullCount / totalRecords) * 100).toFixed(1)}%) have NULL movie_id`);
      console.log('');

      if (recoverableCount > totalRecords * 0.9) {
        console.log('✅ RECOVERY POSSIBLE: tmdb_id join can recover coverage');
        console.log(`   Can recover ${recoverableCount.toLocaleString()} movies via tmdb_id match`);
        console.log('');
        console.log('📋 RECOMMENDED FIX:');
        console.log('   Run the following SQL migration:');
        console.log('');
        console.log('   UPDATE more_ideas mi');
        console.log('   SET movie_id = m.id');
        console.log('   FROM movies m');
        console.log('   WHERE mi.tmdb_id = m.tmdb_id');
        console.log('     AND mi.movie_id IS NULL;');
      } else {
        console.log('⚠️ PARTIAL RECOVERY: Some records cannot be matched');
        console.log(`   Can recover ${recoverableCount.toLocaleString()} movies`);
        console.log(`   Cannot match ${unmatchableCount.toLocaleString()} records`);
      }
    } else if (validCount > totalRecords * 0.9) {
      console.log('✅ NO ISSUE: movie_id fields are mostly valid');
      console.log(`   ${parseInt(validCount).toLocaleString()} records (${((validCount / totalRecords) * 100).toFixed(1)}%) have valid movie_id`);
      console.log('');
      console.log('⚠️ The join issue may be in the measurement query, not the data');
    } else if (orphanedCount > totalRecords * 0.5) {
      console.log('🔴 ORPHANED RECORDS: movie_id values point to non-existent movies');
      console.log(`   ${parseInt(orphanedCount).toLocaleString()} records (${((orphanedCount / totalRecords) * 100).toFixed(1)}%) are orphaned`);
      console.log('');
      console.log('📋 RECOMMENDED FIX: Re-run tmdb_id-based update to fix orphaned records');
    } else {
      console.log('⚠️ MIXED ISSUE: Combination of NULL, valid, and orphaned records');
      console.log(`   NULL: ${parseInt(nullCount).toLocaleString()}`);
      console.log(`   Valid: ${parseInt(validCount).toLocaleString()}`);
      console.log(`   Orphaned: ${parseInt(orphanedCount).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnose().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
