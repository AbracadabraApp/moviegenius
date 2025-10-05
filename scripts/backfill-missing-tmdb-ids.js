#!/usr/bin/env node

/**
 * Backfill Missing TMDB IDs
 *
 * Finds movies with NULL tmdb_id and looks them up via TMDB API
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Search TMDB for movie by title and year
 */
async function searchTMDB(title, year) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.log(`  ⚠️  TMDB API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Return first result (best match)
      const match = data.results[0];
      return {
        tmdb_id: match.id,
        title: match.title,
        year: match.release_date ? new Date(match.release_date).getFullYear() : null
      };
    }

    return null;
  } catch (error) {
    console.log(`  ❌ Error searching TMDB: ${error.message}`);
    return null;
  }
}

/**
 * Main backfill process
 */
async function backfillMissingTMDBIds(dryRun = false) {
  console.log('🔄 Backfill Missing TMDB IDs');
  console.log('============================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`);

  try {
    // Get count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM movies WHERE tmdb_id IS NULL');
    const total = parseInt(countResult.rows[0].total);

    console.log(`📊 Found ${total} movies with NULL tmdb_id\n`);

    if (total === 0) {
      console.log('✅ No movies need backfilling');
      return;
    }

    // Get all movies with NULL tmdb_id
    const result = await pool.query(`
      SELECT id, title, year
      FROM movies
      WHERE tmdb_id IS NULL
      ORDER BY year DESC, title
    `);

    let processed = 0;
    let found = 0;
    let notFound = 0;
    let updated = 0;

    for (const movie of result.rows) {
      processed++;
      console.log(`[${processed}/${total}] ${movie.title} (${movie.year})`);

      // Search TMDB
      const tmdbMatch = await searchTMDB(movie.title, movie.year);

      if (tmdbMatch) {
        console.log(`  ✅ Found: ${tmdbMatch.title} (${tmdbMatch.year}) - TMDB ID: ${tmdbMatch.tmdb_id}`);
        found++;

        if (!dryRun) {
          try {
            await pool.query(
              'UPDATE movies SET tmdb_id = $1 WHERE id = $2',
              [tmdbMatch.tmdb_id, movie.id]
            );
            updated++;
            console.log(`  💾 Updated database`);
          } catch (updateError) {
            if (updateError.code === '23505') {
              // Duplicate key - this TMDB ID already exists
              console.log(`  ⚠️  Duplicate TMDB ID ${tmdbMatch.tmdb_id} - deleting NULL entry`);
              await pool.query('DELETE FROM movies WHERE id = $1', [movie.id]);
              console.log(`  🗑️  Deleted duplicate entry`);
            } else {
              throw updateError;
            }
          }
        }
      } else {
        console.log(`  ❌ Not found on TMDB`);
        notFound++;
      }

      // Rate limit: 40 requests per second = 25ms between requests
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    console.log(`\n📊 Backfill Complete:`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Found: ${found}`);
    console.log(`  Not found: ${notFound}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI
const dryRun = process.argv.includes('--dry-run');
backfillMissingTMDBIds(dryRun).catch(console.error);
