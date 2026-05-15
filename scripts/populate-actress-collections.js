/**
 * Populate Actress Collections
 *
 * Creates browse_lists entries for 45 prestigious actresses (≥10 films)
 * with quality_score = 10 for balanced homepage mix.
 */

import { getPool } from '../lib/database.js';

const actresses = [
  'Bette Davis', 'Meryl Streep', 'Julianne Moore', 'Nicole Kidman',
  'Tilda Swinton', 'Lauren Bacall', 'Sigourney Weaver', 'Katharine Hepburn',
  'Cate Blanchett', 'Barbara Stanwyck', 'Helen Mirren', 'Diane Keaton',
  'Kate Winslet', 'Jane Fonda', 'Marlene Dietrich', 'Vanessa Redgrave',
  'Jessica Lange', 'Charlize Theron', 'Catherine Deneuve', 'Ingrid Bergman',
  'Elizabeth Taylor', 'Emma Thompson', 'Faye Dunaway', 'Shirley MacLaine',
  'Judi Dench', 'Jeanne Moreau', 'Isabelle Huppert', 'Olivia de Havilland',
  'Frances McDormand', 'Judy Garland', 'Joan Crawford', 'Greta Garbo',
  'Ellen Burstyn', 'Audrey Hepburn', 'Sissy Spacek', 'Michelle Yeoh',
  'Rita Hayworth', 'Marion Cotillard', 'Holly Hunter', 'Hilary Swank',
  'Liv Ullmann', 'Jessica Chastain', 'Anna Magnani', 'Vivien Leigh',
  'Viola Davis'
];

async function populateActressCollections() {
  const pool = getPool();

  console.log('Populating actress collections...\n');
  console.log(`Target: ${actresses.length} actresses\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const actressName of actresses) {
    try {
      // 1. Get all films starring this actress
      const films = await pool.query(`
        SELECT DISTINCT
          m.id,
          m.tmdb_id,
          m.title,
          m.year
        FROM movie_contributors mc
        JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
        WHERE mc.person_name = $1
          AND mc.role = 'star'
          AND m.tmdb_id IS NOT NULL
        ORDER BY m.year DESC NULLS LAST
      `, [actressName]);

      if (films.rows.length < 10) {
        console.log(`⚠️  ${actressName}: Only ${films.rows.length} films, skipping`);
        skipped++;
        continue;
      }

      // 2. Check if collection already exists
      const existing = await pool.query(`
        SELECT id FROM browse_lists WHERE title = $1
      `, [actressName]);

      if (existing.rows.length > 0) {
        console.log(`⊘  ${actressName}: Already exists, skipping`);
        skipped++;
        continue;
      }

      // 3. Build editorial_data JSONB structure
      const moviesJson = films.rows.map(film => ({
        tmdb_id: film.tmdb_id,
        title: film.title,
        year: film.year
      }));

      const editorialData = {
        subcategories: [
          {
            name: "Filmography",
            movies: moviesJson
          }
        ]
      };

      // 4. Create browse_list entry
      await pool.query(`
        INSERT INTO browse_lists
          (title, description, curated, quality_score, status, total_movies, categories, editorial_data, created_at, updated_at)
        VALUES ($1, $2, TRUE, 10, 'active', $3, $4, $5, NOW(), NOW())
      `, [
        actressName,
        `Complete filmography of ${actressName} in our catalog.`,
        films.rows.length,
        ['Actresses'],
        JSON.stringify(editorialData)
      ]);

      console.log(`✓ ${actressName}: ${films.rows.length} films`);
      created++;

    } catch (err) {
      console.error(`✗ ${actressName}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${actresses.length}`);

  await pool.end();
}

populateActressCollections().catch(console.error);
