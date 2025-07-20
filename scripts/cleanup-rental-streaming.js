#!/usr/bin/env node
// scripts/cleanup-rental-streaming.js - Remove rental streaming data from database

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupRentalStreaming() {
  console.log('🧹 Starting cleanup of rental streaming data...');

  try {
    // Find all movies with rental streaming data
    const { data: movies, error: selectError } = await supabase
      .from('movies')
      .select('id, title, year, streaming_data')
      .or(
        'streaming_data.ilike.%Available for rent%,' +
          'streaming_data.ilike.%rent on%,' +
          'streaming_data.ilike.%Available for purchase%,' +
          'streaming_data.ilike.%buy on%'
      );

    if (selectError) {
      throw selectError;
    }

    console.log(`📊 Found ${movies.length} movies with rental/purchase streaming data`);

    if (movies.length === 0) {
      console.log('✅ No rental streaming data found - database is clean');
      return;
    }

    // Process each movie
    let updatedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);

      for (const movie of batch) {
        let cleanStreamingData = movie.streaming_data;

        if (cleanStreamingData) {
          // Remove rental and purchase references
          cleanStreamingData = cleanStreamingData
            .replace(/Available for rent[^•]*[•]?\s*/gi, '')
            .replace(/rent on [^•]*[•]?\s*/gi, '')
            .replace(/Available for purchase[^•]*[•]?\s*/gi, '')
            .replace(/buy on [^•]*[•]?\s*/gi, '')
            .replace(/^\s*[•]\s*/gi, '') // Remove leading bullet points
            .replace(/\s*[•]\s*$/gi, '') // Remove trailing bullet points
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          // If empty after cleanup, set to null or 'TBD'
          if (!cleanStreamingData || cleanStreamingData === '') {
            cleanStreamingData = 'TBD';
          }

          // Update the movie if streaming data changed
          if (cleanStreamingData !== movie.streaming_data) {
            const { error: updateError } = await supabase
              .from('movies')
              .update({ streaming_data: cleanStreamingData })
              .eq('id', movie.id);

            if (updateError) {
              console.error(`❌ Failed to update ${movie.title} (${movie.year}):`, updateError);
            } else {
              console.log(`✅ Updated: ${movie.title} (${movie.year})`);
              console.log(`   Before: "${movie.streaming_data}"`);
              console.log(`   After:  "${cleanStreamingData}"`);
              updatedCount++;
            }
          }
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 Cleanup complete! Updated ${updatedCount} movies`);
    console.log(`📈 ${movies.length - updatedCount} movies were already clean`);
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupRentalStreaming()
    .then(() => {
      console.log('✨ Database cleanup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Database cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupRentalStreaming };
