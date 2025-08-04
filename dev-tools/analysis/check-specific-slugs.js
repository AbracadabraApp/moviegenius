// Quick check for specific movie slugs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const movieIds = [996, 678, 22112, 17218];

async function checkSpecificSlugs() {
  for (const tmdbId of movieIds) {
    const { data, error } = await supabase
      .from('movies')
      .select('title, year, slug')
      .eq('tmdb_id', tmdbId)
      .single();
      
    if (error) {
      console.log(`❌ TMDB ${tmdbId}: Error - ${error.message}`);
    } else if (data) {
      const slugStatus = data.slug ? `"${data.slug}"` : 'NULL/EMPTY';
      console.log(`📽️ TMDB ${tmdbId}: "${data.title}" (${data.year}) - Slug: ${slugStatus}`);
    } else {
      console.log(`❌ TMDB ${tmdbId}: Not found in database`);
    }
  }
}

checkSpecificSlugs()
  .then(() => process.exit(0))
  .catch(console.error);