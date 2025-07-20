#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateExtractedTrailers() {
  console.log('🔄 Updating database with extracted trailer data...');

  try {
    // Load extracted trailer data
    const trailersFile = path.join(__dirname, 'trailer-extraction', 'movies-with-trailers.json');
    if (!fs.existsSync(trailersFile)) {
      throw new Error('Trailer data file not found. Run extract-trailer-data.js first.');
    }

    const moviesWithTrailers = JSON.parse(fs.readFileSync(trailersFile, 'utf8'));
    console.log(`📄 Loaded ${moviesWithTrailers.length} movies with trailers`);

    // Process updates in batches
    const BATCH_SIZE = 100;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < moviesWithTrailers.length; i += BATCH_SIZE) {
      const batch = moviesWithTrailers.slice(i, i + BATCH_SIZE);

      console.log(
        `\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(moviesWithTrailers.length / BATCH_SIZE)} (${batch.length} movies)...`
      );

      // Process each movie in the batch
      for (const movie of batch) {
        try {
          // Update the movie with trailer_url (match by TMDB ID, not primary key)
          const { data, error } = await supabase
            .from('movies')
            .update({ trailer_url: movie.trailerId })
            .eq('tmdb_id', movie.movieId)
            .select('id, tmdb_id, title, trailer_url');

          if (error) {
            throw error;
          }

          if (data && data.length > 0) {
            updatedCount++;
            if (updatedCount % 50 === 0) {
              console.log(`  ✅ Updated ${updatedCount} movies so far...`);
            }
          } else {
            console.log(`  ⚠️  Movie with TMDB ID ${movie.movieId} not found in database`);
          }
        } catch (error) {
          errorCount++;
          errors.push({
            movieId: movie.movieId,
            trailerId: movie.trailerId,
            error: error.message,
          });

          if (errorCount <= 5) {
            console.log(`  ❌ Error updating TMDB ID ${movie.movieId}: ${error.message}`);
          }
        }
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Update Results:`);
    console.log(`✅ Successfully updated: ${updatedCount} movies`);
    console.log(`❌ Errors: ${errorCount} movies`);

    if (errors.length > 0) {
      // Save errors for review
      const errorsFile = path.join(__dirname, 'trailer-extraction', 'update-errors.json');
      fs.writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
      console.log(`📝 Saved error details to: ${errorsFile}`);
    }

    // Validate the updates
    console.log(`\n🔍 Validating updates...`);
    const { count: trailerCount } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .not('trailer_url', 'is', null);

    console.log(`✅ Total movies with trailers in database: ${trailerCount}`);

    // Sample validation
    const { data: sampleMovies } = await supabase
      .from('movies')
      .select('id, title, trailer_url')
      .not('trailer_url', 'is', null)
      .limit(5);

    console.log(`\n🎬 Sample updated movies:`);
    sampleMovies?.forEach(movie => {
      console.log(`  ${movie.title}: ${movie.trailer_url}`);
    });

    return {
      totalProcessed: moviesWithTrailers.length,
      updatedCount,
      errorCount,
      errors,
    };
  } catch (error) {
    console.error('❌ Error updating extracted trailers:', error.message);
    process.exit(1);
  }
}

// Run updates
if (require.main === module) {
  updateExtractedTrailers();
}

module.exports = { updateExtractedTrailers };
