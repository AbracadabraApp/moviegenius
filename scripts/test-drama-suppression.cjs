/**
 * Test Drama Suppression Rule
 *
 * Samples 50 collections and shows before/after categories
 */

const { Pool } = require('pg');

async function testDramaSuppression() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('DRAMA SUPPRESSION TEST - SAMPLE 50 COLLECTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get 50 random collections that currently have Drama + other categories
    const sample = await pool.query(`
      SELECT id, title, categories::text
      FROM browse_lists
      WHERE status = 'active'
        AND 'Drama' = ANY(categories)
        AND array_length(categories, 1) > 1
      ORDER BY RANDOM()
      LIMIT 50
    `);

    console.log(`Found ${sample.rows.length} collections with Drama + other categories\n`);
    console.log('Collection Title | Current Categories | Would Become');
    console.log('-----------------|-------------------|-------------');

    let dramaKeptCount = 0;
    let dramaDroppedCount = 0;

    for (const row of sample.rows) {
      const currentCats = row.categories
        .replace(/[{}]/g, '')
        .split(',')
        .map(c => c.trim().replace(/^"|"$/g, ''));

      // Get movie genre data to recalculate
      const editorialQuery = await pool.query(
        `SELECT editorial_data FROM browse_lists WHERE id = $1`,
        [row.id]
      );

      if (!editorialQuery.rows[0]?.editorial_data) continue;

      const editorial = editorialQuery.rows[0].editorial_data;
      const tmdbIds = [];
      for (const sub of (editorial.subcategories || [])) {
        for (const m of (sub.movies || [])) {
          if (m.tmdb_id) tmdbIds.push(m.tmdb_id);
        }
      }

      if (tmdbIds.length === 0) continue;

      const moviesQuery = `
        SELECT ma.enhanced_key_elements::jsonb->>'genre' as genre
        FROM movies m
        LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE m.tmdb_id = ANY($1)
          AND ma.enhanced_key_elements::jsonb->>'genre' IS NOT NULL
          AND ma.enhanced_key_elements::jsonb->>'genre' != ''
      `;

      const movies = await pool.query(moviesQuery, [tmdbIds]);
      if (movies.rows.length === 0) continue;

      // Count Drama matches
      let dramaCount = 0;
      movies.rows.forEach(movie => {
        const genreString = movie.genre.toLowerCase();
        if (genreString.includes('drama')) {
          dramaCount++;
        }
      });

      const dramaPercentage = (dramaCount / movies.rows.length) * 100;

      // Apply Drama suppression rule
      let newCats = [...currentCats];
      if (dramaPercentage < 70 && currentCats.length > 1) {
        newCats = currentCats.filter(cat => cat !== 'Drama');
        dramaDroppedCount++;
      } else {
        dramaKeptCount++;
      }

      const title = row.title.length > 35 ? row.title.substring(0, 32) + '...' : row.title;
      const current = currentCats.join(', ');
      const after = newCats.join(', ');

      const changed = current !== after ? '⚡' : '  ';
      console.log(`${changed} ${title.padEnd(35)} | ${current.padEnd(35)} | ${after}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Drama KEPT (≥70% match):    ${dramaKeptCount}`);
    console.log(`Drama DROPPED (<70% match): ${dramaDroppedCount}`);
    console.log(`\nImpact: ${((dramaDroppedCount / sample.rows.length) * 100).toFixed(1)}% of sampled collections would lose Drama tag`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

testDramaSuppression();
