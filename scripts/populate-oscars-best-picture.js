/**
 * Populate Oscar Best Picture Winners Collection
 *
 * Creates browse_list entry for Academy Award Best Picture winners (1929-2024)
 * with quality_score = 10 for balanced homepage mix.
 *
 * Ordered chronologically by ceremony year (earliest to most recent).
 */

import { getPool } from '../lib/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function populateOscarsBestPicture() {
  const pool = getPool();

  console.log('Populating Oscar Best Picture Winners collection...\n');

  try {
    // 1. Load Oscar Best Picture data
    const dataPath = path.join(__dirname, '../data/oscars-best-picture.json');
    const oscarData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`Loaded ${oscarData.length} Best Picture winners\n`);

    // 2. Check if collection already exists
    const existing = await pool.query(`
      SELECT id FROM browse_lists WHERE title = $1
    `, ['Oscar Best Picture Winners']);

    if (existing.rows.length > 0) {
      console.log(`⊘  Oscar Best Picture Winners: Already exists (id: ${existing.rows[0].id})`);
      console.log('   Delete and recreate? Run: DELETE FROM browse_lists WHERE title = \'Oscar Best Picture Winners\'');
      await pool.end();
      return;
    }

    // 3. Verify films exist in database and match by title
    const moviesJson = [];
    let foundCount = 0;
    let missingCount = 0;
    const missing = [];

    for (const film of oscarData) {
      // Try to find by title (case-insensitive, allowing for minor variations)
      const result = await pool.query(`
        SELECT tmdb_id, title, year
        FROM movies
        WHERE title ILIKE $1
        ORDER BY year ASC
        LIMIT 1
      `, [film.title]);

      if (result.rows.length > 0) {
        moviesJson.push({
          tmdb_id: result.rows[0].tmdb_id,
          title: result.rows[0].title,
          year: result.rows[0].year,
          ceremony_year: film.ceremony_year,
          oscar_rank: film.rank
        });
        foundCount++;
      } else {
        console.log(`⚠️  Missing: ${film.title} (ceremony ${film.ceremony_year})`);
        missing.push(film);
        missingCount++;
      }
    }

    console.log(`\n✓ Found ${foundCount}/${oscarData.length} films in database`);
    if (missingCount > 0) {
      console.log(`⚠️  Missing ${missingCount} films - will create collection with available films\n`);
      console.log('Missing films:');
      missing.forEach(f => console.log(`  - ${f.title} (${f.ceremony_year})`));
    }

    // 4. Build editorial_data JSONB structure (chronological by ceremony year)
    const editorialData = {
      subcategories: [
        {
          name: "Best Picture Winners",
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
      'Oscar Best Picture Winners',
      'Complete collection of Academy Award Best Picture winners from 1929 to 2024.',
      moviesJson.length,
      ['Academy Awards'],
      JSON.stringify(editorialData)
    ]);

    console.log(`\n✓ Oscar Best Picture Winners: ${moviesJson.length} films`);
    console.log('\n=== SUMMARY ===');
    console.log(`Created: 1 collection`);
    console.log(`Total films: ${moviesJson.length}`);
    console.log(`Missing: ${missingCount}`);

  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
  }

  await pool.end();
}

populateOscarsBestPicture().catch(console.error);
