/**
 * Fix NULL TMDB IDs - Look up and update missing TMDB IDs
 *
 * Finds movies with NULL tmdb_id and looks them up in TMDB API
 *
 * Usage:
 *   node scripts/fix-null-tmdb-ids.js [--dry-run]
 */

import { getPool } from '../lib/railway-db.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('🔍 Fix NULL TMDB IDs Script');
console.log('===========================\n');
if (dryRun) console.log('🧪 DRY RUN MODE - No updates\n');

// Manual mapping for the 20 movies with NULL TMDB IDs
const TMDB_ID_MAPPING = {
  '400 Blows (1959)': 323,
  'But I\'m a Cheerleader (1999)': 10147,
  'Casablanca (1942)': 289,
  'Dead Alive (1992)': 10595,
  'Demon Knight (1995)': 28317,
  'Kings of Summer (2013)': 122906,
  'La Belle et la Bête (1946)': 3010,
  'Lives of Others (2006)': 1429,
  'Milo and Otis (1986)': 19012,
  'Mission Control (2017)': 457799,
  'Monsters Inc. (2001)': 585,
  'Ocean\'s 8 (2018)': 402900,
  'Public Enemy (1931)': 27579,
  'Sleep (1963)': 155590,
  'Star Wars: A New Hope (1977)': 11,
  'The LEGO Batman Movie (2017)': 324849,
  'The Neverending Story (1984)': 2179,
  'The VVitch (2015)': 310131,
  'The Wire (2002)': 1438,  // TV series
  'Tree of Life (2011)': 57917
};

async function fixNullTmdbIds() {
  const pool = getPool();

  try {
    // Get movies with NULL TMDB IDs
    const query = `
      SELECT m.id, m.title, m.year
      FROM movies m
      WHERE m.tmdb_id IS NULL
      AND EXISTS (
        SELECT 1 FROM movie_analyses ma
        WHERE ma.movie_id = m.id
        AND ma.claude_response->>'raw_content' LIKE '{%'
      )
      ORDER BY m.title
    `;

    const result = await pool.query(query);
    const movies = result.rows;

    console.log(`📊 Found ${movies.length} movies with NULL TMDB IDs\n`);

    let updated = 0;
    let notFound = 0;

    for (const movie of movies) {
      const key = `${movie.title} (${movie.year})`;
      const tmdbId = TMDB_ID_MAPPING[key];

      if (tmdbId) {
        console.log(`✅ ${key} → TMDB ID: ${tmdbId}`);

        if (!dryRun) {
          const updateQuery = `
            UPDATE movies
            SET tmdb_id = $1, updated_at = NOW()
            WHERE id = $2
          `;
          await pool.query(updateQuery, [tmdbId, movie.id]);
          updated++;
        }
      } else {
        console.log(`❌ ${key} → No TMDB ID found (needs manual lookup)`);
        notFound++;
      }
    }

    console.log('\n===========================');
    console.log('✅ Fix Complete!\n');
    console.log(`📊 Statistics:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Not found: ${notFound}`);

    if (dryRun) {
      console.log('\n🧪 DRY RUN - No database changes made');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixNullTmdbIds();