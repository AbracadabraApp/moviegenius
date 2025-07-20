/**
 * Nuclear Trailer Populator - Get ALL trailers at once
 *
 * Fetches trailers for every movie in the database with a TMDB ID
 * Uses the existing API endpoint for consistency
 *
 * Usage: node scripts/nuclear-trailer-populator.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 10;
const DELAY_MS = 200; // Rate limiting

async function nuclearTrailerPopulator() {
  console.log('💥 NUCLEAR TRAILER POPULATOR - Getting ALL trailers');

  try {
    // Get all movies with TMDB IDs that don't have trailers
    const { data: movies, error } = await supabase
      .from('movies')
      .select('tmdb_id, title, year')
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return;
    }

    console.log(`🎬 Found ${movies.length} movies without trailers`);

    let processed = 0;
    let found = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);

      console.log(
        `\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(movies.length / BATCH_SIZE)}`
      );

      // Process batch in parallel
      const promises = batch.map(async movie => {
        try {
          console.log(`  🎭 ${movie.title} (${movie.year})`);

          // Use our existing API endpoint
          const response = await fetch(
            `http://localhost:3000/api/tmdb-trailer?tmdbId=${movie.tmdb_id}`
          );
          const data = await response.json();

          processed++;

          if (data.videoId) {
            found++;
            console.log(`    ✅ Found trailer: ${data.videoId}`);
          } else {
            console.log(`    ❌ No trailer`);
          }
        } catch (error) {
          errors++;
          console.error(`    💥 Error: ${error.message}`);
        }
      });

      await Promise.all(promises);

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < movies.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n💥 NUCLEAR POPULATOR COMPLETE!');
    console.log(`📊 Results:`);
    console.log(`  • Processed: ${processed}`);
    console.log(`  • Found trailers: ${found}`);
    console.log(`  • Errors: ${errors}`);
    console.log(`  • Success rate: ${((found / processed) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('💥 Nuclear populator failed:', error);
  }
}

// Run immediately
nuclearTrailerPopulator();
