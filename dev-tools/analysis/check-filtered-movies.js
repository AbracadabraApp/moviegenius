// Check if filtered movies exist in database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Movies that were filtered out from the logs
const filteredMovies = [
  { title: "Diamonds of the Night", logged_tmdb_id: 100589 },
  { title: "In the Fog", logged_tmdb_id: 103742 },
  { title: "Stalingrad", logged_tmdb_id: 11101 },
  { title: "The Pianist", logged_tmdb_id: 423 },
  { title: "Generation War", logged_tmdb_id: 352547 },
  { title: "Katyn", logged_tmdb_id: 13614 }
];

async function checkFilteredMovies() {
  console.log('🔍 Checking filtered movies in database...\n');
  
  for (const movie of filteredMovies) {
    try {
      // Search by title first
      const { data: titleResults, error: titleError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, slug, poster_url')
        .ilike('title', `%${movie.title}%`);
        
      if (titleError) {
        console.error(`❌ Error searching for "${movie.title}":`, titleError.message);
        continue;
      }
      
      // Also search by TMDB ID
      const { data: tmdbResults, error: tmdbError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, slug, poster_url')
        .eq('tmdb_id', movie.logged_tmdb_id);
        
      if (tmdbError) {
        console.error(`❌ Error searching for TMDB ID ${movie.logged_tmdb_id}:`, tmdbError.message);
        continue;
      }
      
      console.log(`📽️ "${movie.title}" (Expected TMDB: ${movie.logged_tmdb_id})`);
      
      if (titleResults && titleResults.length > 0) {
        console.log(`  ✅ Found ${titleResults.length} title matches:`);
        titleResults.forEach((result, i) => {
          console.log(`    ${i+1}. "${result.title}" (${result.year}) - TMDB: ${result.tmdb_id}`);
          console.log(`       ID: ${result.id}, Slug: ${result.slug ? result.slug.substring(0, 50) + '...' : 'NULL'}`);
        });
      } else {
        console.log(`  ❌ No title matches found`);
      }
      
      if (tmdbResults && tmdbResults.length > 0) {
        console.log(`  ✅ Found ${tmdbResults.length} TMDB ID matches:`);
        tmdbResults.forEach((result, i) => {
          console.log(`    ${i+1}. "${result.title}" (${result.year}) - TMDB: ${result.tmdb_id}`);
          console.log(`       ID: ${result.id}, Slug: ${result.slug ? result.slug.substring(0, 50) + '...' : 'NULL'}`);
        });
      } else {
        console.log(`  ❌ No TMDB ID matches found`);
      }
      
      console.log(''); // Empty line for readability
      
    } catch (error) {
      console.error(`❌ Unexpected error checking "${movie.title}":`, error.message);
    }
  }
}

checkFilteredMovies()
  .then(() => {
    console.log('✅ Database check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });