#!/usr/bin/env node
/**
 * Backfill All Movie Trailers
 * Iterates through every movie in the database and populates trailer_url
 * Run: node --env-file=.env.local backfill-all-trailers.cjs
 */

const { Pool } = require('pg');

async function backfillAllTrailers() {
  console.log('🎬 Starting trailer backfill for all movies...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5
  });

  try {
    const client = await pool.connect();

    // Get all movies without trailers (resume from last processed)
    console.log('🔍 Fetching movies without trailers...');

    // Find the highest tmdb_id that already has a trailer (for resume capability)
    const lastProcessedResult = await client.query(`
      SELECT MAX(tmdb_id) as last_processed
      FROM movies
      WHERE tmdb_id IS NOT NULL
      AND trailer_url IS NOT NULL
      AND trailer_url != ''
    `);

    const resumeFromId = lastProcessedResult.rows[0]?.last_processed || 0;
    if (resumeFromId > 0) {
      console.log(`🔄 Resuming from movie ID ${resumeFromId + 1}...`);
    }

    const result = await client.query(`
      SELECT tmdb_id, title
      FROM movies
      WHERE tmdb_id IS NOT NULL
      AND tmdb_id > $1
      AND (trailer_url IS NULL OR trailer_url = '')
      ORDER BY tmdb_id ASC
    `, [resumeFromId]);

    const movies = result.rows;
    console.log(`📊 Found ${movies.length} movies to process\n`);

    if (movies.length === 0) {
      console.log('✅ All movies already have trailers!');
      return;
    }

    let processed = 0;
    let found = 0;
    let errors = 0;
    const startTime = Date.now();

    for (const movie of movies) {
      try {
        console.log(`[${processed + 1}/${movies.length}] Processing: ${movie.title} (${movie.tmdb_id})`);

        // Call TMDB API directly
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.tmdb_id}/videos?api_key=${process.env.TMDB_API_KEY}`
        );

        if (!tmdbResponse.ok) {
          if (tmdbResponse.status === 429) {
            console.log(`   ⏳ Rate limited, waiting 10 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue; // Retry this movie
          }
          console.log(`   ❌ TMDB API error: ${tmdbResponse.status}`);
          errors++;
          processed++;
          continue;
        }

        const tmdbData = await tmdbResponse.json();

        // Find YouTube trailer
        const trailer = tmdbData.results?.find(video =>
          video.type === 'Trailer' &&
          video.site === 'YouTube' &&
          video.key
        );

        if (trailer) {
          // Update database
          await client.query(
            'UPDATE movies SET trailer_url = $1 WHERE tmdb_id = $2',
            [trailer.key, movie.tmdb_id]
          );
          console.log(`   ✅ Found trailer: ${trailer.key}`);
          found++;
        } else {
          console.log(`   ⚠️  No trailer found`);
        }

        processed++;

        // Progress update every 50 movies
        if (processed % 50 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = processed / elapsed;
          const remaining = movies.length - processed;
          const eta = remaining / rate;

          console.log(`\n📊 Progress: ${processed}/${movies.length} (${(processed/movies.length*100).toFixed(1)}%)`);
          console.log(`🎯 Trailers found: ${found} (${(found/processed*100).toFixed(1)}% success rate)`);
          console.log(`⚡ Rate: ${rate.toFixed(1)} movies/sec, ETA: ${(eta/60).toFixed(1)} minutes\n`);
        }

        // Rate limiting - be gentle on TMDB (500ms delay = ~2 requests/sec)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
        errors++;
        processed++;
      }
    }

    client.release();

    // Final summary
    const elapsed = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TRAILER BACKFILL COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Total processed: ${processed}`);
    console.log(`✅ Trailers found: ${found} (${(found/processed*100).toFixed(1)}% success rate)`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Time elapsed: ${(elapsed/60).toFixed(1)} minutes`);
    console.log(`⚡ Average rate: ${(processed/elapsed).toFixed(1)} movies/sec`);

  } catch (finalError) {
    console.error('💥 Final error in backfill process:', finalError.message);
  } finally {
    try {
      await pool.end();
      console.log('📝 Database connection closed cleanly');
    } catch (closeError) {
      console.error('⚠️  Warning: Error closing database connection:', closeError.message);
    }
  }
}

// Run backfill
backfillAllTrailers().catch(console.error);