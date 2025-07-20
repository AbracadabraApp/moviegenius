#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const MAX_TMDB_ID = 278168; // Process up to this TMDB ID

async function getMoviesNeedingTrailers() {
  console.log('🔍 Finding movies with analysis that need trailers...');

  // Get movies with analysis that don't have trailers yet
  const { data: moviesWithAnalysis, error } = await supabase
    .from('movies')
    .select(
      `
      id,
      tmdb_id,
      title,
      year,
      trailer_url,
      movie_analyses!inner(analysis_type)
    `
    )
    .eq('movie_analyses.analysis_type', 'page_analysis')
    .lte('tmdb_id', MAX_TMDB_ID)
    .not('tmdb_id', 'is', null)
    .order('tmdb_id', { ascending: true });

  if (error) {
    throw error;
  }

  // Filter out movies that already have trailers
  const needTrailers = moviesWithAnalysis.filter(
    movie => !movie.trailer_url || movie.trailer_url.trim() === ''
  );

  console.log(`📊 Analysis Results:`);
  console.log(
    `Total movies with analysis (TMDB ID ≤ ${MAX_TMDB_ID}): ${moviesWithAnalysis.length}`
  );
  console.log(`Movies already with trailers: ${moviesWithAnalysis.length - needTrailers.length}`);
  console.log(`Movies needing trailers: ${needTrailers.length}`);

  return needTrailers;
}

async function fetchTrailerFromTMDB(tmdbId) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    const videos = data.results || [];

    // Find the best trailer
    const trailers = videos.filter(video => video.type === 'Trailer' && video.site === 'YouTube');

    if (trailers.length === 0) {
      return null;
    }

    // Prioritize official trailers
    const officialTrailer = trailers.find(t => t.official === true);
    if (officialTrailer) {
      return officialTrailer.key;
    }

    // Return first trailer if no official one
    return trailers[0].key;
  } catch (error) {
    console.log(`  ❌ Error fetching trailer for TMDB ID ${tmdbId}: ${error.message}`);
    return null;
  }
}

async function populateTrailers() {
  console.log('🎬 Starting trailer population for gap movies...\n');

  try {
    const movies = await getMoviesNeedingTrailers();

    if (movies.length === 0) {
      console.log('✅ All movies with analysis already have trailers!');
      return;
    }

    let processedCount = 0;
    let foundCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 10;

    console.log(`\n🔄 Processing ${movies.length} movies in batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(movies.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} movies):`);

      for (const movie of batch) {
        processedCount++;

        try {
          const trailerId = await fetchTrailerFromTMDB(movie.tmdb_id);

          if (trailerId) {
            // Update database with trailer
            const { error: updateError } = await supabase
              .from('movies')
              .update({ trailer_url: trailerId })
              .eq('id', movie.id);

            if (updateError) {
              throw updateError;
            }

            foundCount++;
            console.log(
              `  ✅ [${processedCount}] ${movie.title} (${movie.year}) - NEW: ${trailerId}`
            );
          } else {
            console.log(
              `  📝 [${processedCount}] ${movie.title} (${movie.year}) - No trailer found`
            );
          }
        } catch (error) {
          errorCount++;
          console.log(`  ❌ [${processedCount}] ${movie.title} - Error: ${error.message}`);
        }

        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Progress update
      if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
        console.log(`\n📊 Progress Update:`);
        console.log(`  • Processed: ${processedCount}/${movies.length}`);
        console.log(`  • Trailers found: ${foundCount}`);
        console.log(`  • Errors: ${errorCount}`);
        console.log(`  • Success rate: ${((foundCount / processedCount) * 100).toFixed(1)}%\n`);
      }
    }

    console.log(`\n🎉 Trailer population complete!`);
    console.log(`📊 Final Results:`);
    console.log(`  • Total processed: ${processedCount}`);
    console.log(`  • Trailers found: ${foundCount}`);
    console.log(`  • Errors: ${errorCount}`);
    console.log(`  • Success rate: ${((foundCount / processedCount) * 100).toFixed(1)}%`);

    // Validate final state
    const { count: totalWithTrailers } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .not('trailer_url', 'is', null);

    console.log(`\n✅ Total movies with trailers in database: ${totalWithTrailers}`);
  } catch (error) {
    console.error('❌ Error populating trailers:', error.message);
    process.exit(1);
  }
}

// Run trailer population
if (require.main === module) {
  populateTrailers();
}

module.exports = { populateTrailers };
