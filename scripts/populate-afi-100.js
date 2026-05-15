/**
 * Populate AFI 100 Collection
 *
 * Creates browse_list entry for AFI's 100 Greatest American Films
 * with quality_score = 10 for balanced homepage mix.
 */

import { getPool } from '../lib/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function populateAFI100() {
  const pool = getPool();

  console.log('Populating AFI 100 Greatest Films collection...\n');

  try {
    // 1. Load AFI 100 data
    const afiPath = path.join(__dirname, '../quarantine/legacy-data/afi100.json');
    const afiData = JSON.parse(fs.readFileSync(afiPath, 'utf-8'));

    console.log(`Loaded ${afiData.length} films from AFI 100 list\n`);

    // 2. Check if collection already exists
    const existing = await pool.query(`
      SELECT id FROM browse_lists WHERE title = $1
    `, ['AFI 100 Greatest Films']);

    if (existing.rows.length > 0) {
      console.log(`⊘  AFI 100 Greatest Films: Already exists (id: ${existing.rows[0].id})`);
      console.log('   Delete and recreate? Run: DELETE FROM browse_lists WHERE title = \'AFI 100 Greatest Films\'');
      await pool.end();
      return;
    }

    // 3. Verify films exist in database and get tmdb_ids
    // IMPORTANT: Maintain AFI ranking order (1-100) from source file
    const moviesJson = [];
    let foundCount = 0;
    let missingCount = 0;

    for (let i = 0; i < afiData.length; i++) {
      const film = afiData[i];
      const afiRank = i + 1; // AFI ranking: 1 = most important

      // Try to find by tmdbId first, then by title+year
      let result;
      if (film.tmdbId) {
        result = await pool.query(`
          SELECT tmdb_id, title, year
          FROM movies
          WHERE tmdb_id = $1
        `, [film.tmdbId]);
      }

      if (!result || result.rows.length === 0) {
        // Fallback to title+year match
        result = await pool.query(`
          SELECT tmdb_id, title, year
          FROM movies
          WHERE title ILIKE $1 AND year = $2
        `, [film.title, film.year]);
      }

      if (result.rows.length > 0) {
        moviesJson.push({
          tmdb_id: result.rows[0].tmdb_id,
          title: result.rows[0].title,
          year: result.rows[0].year,
          afi_rank: afiRank
        });
        foundCount++;
      } else {
        console.log(`⚠️  Missing #${afiRank}: ${film.title} (${film.year}) - tmdbId: ${film.tmdbId}`);
        missingCount++;
      }
    }

    console.log(`\n✓ Found ${foundCount}/${afiData.length} films in database`);
    if (missingCount > 0) {
      console.log(`⚠️  Missing ${missingCount} films - will create collection with available films\n`);
    }

    // 4. Build editorial_data JSONB structure
    const editorialData = {
      subcategories: [
        {
          name: "AFI Ranking",
          movies: moviesJson
        }
      ]
    };

    // 5. Create browse_list entry
    await pool.query(`
      INSERT INTO browse_lists
        (title, description, curated, quality_score, status, total_movies, categories, editorial_data, created_at, updated_at)
      VALUES ($1, $2, TRUE, 10, 'active', $3, $4, $5, NOW(), NOW())
    `, [
      'AFI 100 Greatest Films',
      'The American Film Institute\'s definitive list of the 100 greatest American films of all time.',
      moviesJson.length,
      ['Awards'],
      JSON.stringify(editorialData)
    ]);

    console.log(`✓ AFI 100 Greatest Films: ${moviesJson.length} films`);
    console.log('\n=== SUMMARY ===');
    console.log(`Created: 1 collection`);
    console.log(`Total films: ${moviesJson.length}`);
    console.log(`Missing: ${missingCount}`);

  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
  }

  await pool.end();
}

populateAFI100().catch(console.error);
