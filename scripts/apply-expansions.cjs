/**
 * Apply Expansion Candidates to Collections
 *
 * Takes expansion candidates from browse_lists.expansion_candidates
 * and actually adds those movies to the collections.
 *
 * This will:
 * - Find/create movie records for each candidate
 * - Insert into list_movies
 * - Update total_movies count
 *
 * Estimated runtime: ~30 minutes for 7,511 collections
 */

const { Pool } = require('pg');
const fs = require('fs');

async function applyExpansions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('APPLYING EXPANSION CANDIDATES TO COLLECTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all collections with expansion candidates
    const collectionsQuery = `
      SELECT id, title, total_movies, expansion_candidates
      FROM browse_lists
      WHERE status = 'active'
        AND expansion_candidates IS NOT NULL
        AND jsonb_array_length(expansion_candidates->'candidates') > 0
      ORDER BY total_movies ASC
    `;

    const collections = await pool.query(collectionsQuery);
    const total = collections.rows.length;

    console.log(`Found ${total.toLocaleString()} collections with expansion candidates\n`);
    console.log('Starting expansion application...\n');

    const stats = {
      processed: 0,
      successful: 0,
      moviesAdded: 0,
      errors: []
    };

    const startTime = Date.now();

    for (let idx = 0; idx < collections.rows.length; idx++) {
      const collection = collections.rows[idx];

      try {
        await pool.query('BEGIN');

        const candidates = collection.expansion_candidates.candidates;

        // Get current max display_order
        const maxOrderResult = await pool.query(
          `SELECT COALESCE(MAX(display_order), 0) as max_order
           FROM list_movies
           WHERE list_id = $1`,
          [collection.id]
        );

        let displayOrder = maxOrderResult.rows[0].max_order + 1;
        let addedCount = 0;

        for (const candidate of candidates) {
          // Find or create movie record
          const movieQuery = `
            SELECT id FROM movies WHERE tmdb_id = $1
          `;
          const movieResult = await pool.query(movieQuery, [candidate.tmdbId]);

          let movieId;

          if (movieResult.rows.length > 0) {
            movieId = movieResult.rows[0].id;
          } else {
            // Create movie record
            const insertMovie = await pool.query(
              `INSERT INTO movies (tmdb_id, title, year, created_at, updated_at)
               VALUES ($1, $2, $3, NOW(), NOW())
               RETURNING id`,
              [candidate.tmdbId, candidate.title, candidate.year]
            );
            movieId = insertMovie.rows[0].id;
          }

          // Check if movie is already in this collection
          const existsQuery = `
            SELECT 1 FROM list_movies
            WHERE list_id = $1 AND movie_id = $2
          `;
          const exists = await pool.query(existsQuery, [collection.id, movieId]);

          if (exists.rows.length === 0) {
            // Add to collection
            await pool.query(
              `INSERT INTO list_movies (list_id, movie_id, display_order, relevance_score, added_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [collection.id, movieId, displayOrder, candidate.score || 0.5]
            );
            displayOrder++;
            addedCount++;
          }
        }

        // Update total_movies count
        const newTotal = collection.total_movies + addedCount;
        await pool.query(
          `UPDATE browse_lists
           SET total_movies = $1, updated_at = NOW()
           WHERE id = $2`,
          [newTotal, collection.id]
        );

        await pool.query('COMMIT');

        stats.processed++;
        stats.successful++;
        stats.moviesAdded += addedCount;

        // Progress indicator every 50 collections
        if ((idx + 1) % 50 === 0 || idx === collections.rows.length - 1) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = stats.processed / elapsed;
          const remaining = total - stats.processed;
          const eta = remaining / rate;

          process.stdout.write(
            `  Progress: ${stats.processed}/${total} ` +
            `(${((stats.processed / total) * 100).toFixed(1)}%) | ` +
            `${rate.toFixed(1)}/sec | ` +
            `Movies added: ${stats.moviesAdded.toLocaleString()} | ` +
            `ETA: ${Math.round(eta / 60)}min     \r`
          );
        }

      } catch (error) {
        await pool.query('ROLLBACK');
        stats.errors.push({
          collection_id: collection.id,
          collection_title: collection.title,
          error: error.message
        });
        stats.processed++;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('EXPANSION APPLICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total collections processed: ${stats.processed.toLocaleString()}`);
    console.log(`Successful expansions: ${stats.successful.toLocaleString()}`);
    console.log(`Total movies added: ${stats.moviesAdded.toLocaleString()}`);
    console.log(`Average movies added per collection: ${(stats.moviesAdded / stats.successful).toFixed(1)}`);
    console.log(`\nTotal time: ${Math.round(totalTime / 60)} minutes (${totalTime.toFixed(1)} seconds)`);
    console.log(`Processing rate: ${(stats.processed / totalTime).toFixed(2)} collections/second\n`);

    if (stats.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${stats.errors.length}`);
      console.log('\nFirst 10 errors:');
      stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. "${err.collection_title}" (${err.collection_id})`);
        console.log(`     Error: ${err.error}`);
      });

      fs.writeFileSync(
        '/tmp/apply-expansion-errors.json',
        JSON.stringify(stats.errors, null, 2)
      );
      console.log('\nFull error log written to /tmp/apply-expansion-errors.json\n');
    }

    // Show final distribution
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('FINAL COLLECTION SIZE DISTRIBUTION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const distQuery = `
      SELECT
        CASE
          WHEN total_movies BETWEEN 1 AND 5 THEN '1-5 movies'
          WHEN total_movies BETWEEN 6 AND 10 THEN '6-10 movies'
          WHEN total_movies BETWEEN 11 AND 20 THEN '11-20 movies'
          WHEN total_movies BETWEEN 21 AND 50 THEN '21-50 movies'
          WHEN total_movies BETWEEN 51 AND 100 THEN '51-100 movies'
          WHEN total_movies > 100 THEN '100+ movies'
        END as range,
        COUNT(*) as collection_count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM browse_lists WHERE status = 'active')), 1) as percentage
      FROM browse_lists
      WHERE status = 'active'
      GROUP BY range
      ORDER BY MIN(total_movies)
    `;

    const dist = await pool.query(distQuery);

    console.log('Range         | Collections | Percentage');
    console.log('--------------|-------------|------------');

    dist.rows.forEach(r => {
      const count = String(r.collection_count).padStart(5, ' ');
      const pct = String(r.percentage).padStart(5, ' ');
      console.log(`${r.range.padEnd(13, ' ')} |   ${count}     |   ${pct}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the expansion application
applyExpansions();
