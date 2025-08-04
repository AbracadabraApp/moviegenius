// Check if missing slugs correlate with older database entries
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSlugAgeCorrelation() {
  console.log('🔍 Checking if missing slugs correlate with older database entries...\n');
  
  try {
    // Get movies with missing/empty slugs and their creation dates
    const { data: moviesWithoutSlugs, error: noSlugError } = await supabase
      .from('movies')
      .select('id, title, year, created_at, updated_at')
      .or('slug.is.null,slug.eq.')
      .order('created_at', { ascending: true })
      .limit(20);
      
    if (noSlugError) {
      console.error('Error fetching movies without slugs:', noSlugError);
      return;
    }

    // Get movies with slugs and their creation dates  
    const { data: moviesWithSlugs, error: withSlugError } = await supabase
      .from('movies')
      .select('id, title, year, slug, created_at, updated_at')
      .not('slug', 'is', null)
      .neq('slug', '')
      .order('created_at', { ascending: true })
      .limit(20);
      
    if (withSlugError) {
      console.error('Error fetching movies with slugs:', withSlugError);
      return;
    }

    console.log('🚫 MOVIES WITHOUT SLUGS (oldest first):');
    console.log('===============================================');
    moviesWithoutSlugs.forEach((movie, i) => {
      const createdDate = movie.created_at ? new Date(movie.created_at).toLocaleDateString() : 'Unknown';
      console.log(`${i+1}. "${movie.title}" (${movie.year}) - Created: ${createdDate}`);
    });
    
    console.log('\n✅ MOVIES WITH SLUGS (oldest first):');
    console.log('====================================');
    moviesWithSlugs.forEach((movie, i) => {
      const createdDate = movie.created_at ? new Date(movie.created_at).toLocaleDateString() : 'Unknown';
      const slugPreview = movie.slug ? movie.slug.substring(0, 30) + '...' : 'NULL';
      console.log(`${i+1}. "${movie.title}" (${movie.year}) - Created: ${createdDate} - Slug: ${slugPreview}`);
    });
    
    // Get average creation dates
    if (moviesWithoutSlugs.length > 0) {
      const avgDateWithoutSlugs = moviesWithoutSlugs
        .filter(m => m.created_at)
        .reduce((sum, movie) => sum + new Date(movie.created_at).getTime(), 0) / 
        moviesWithoutSlugs.filter(m => m.created_at).length;
      
      console.log(`\n📊 Average creation date (movies without slugs): ${new Date(avgDateWithoutSlugs).toLocaleDateString()}`);
    }
    
    if (moviesWithSlugs.length > 0) {
      const avgDateWithSlugs = moviesWithSlugs
        .filter(m => m.created_at)
        .reduce((sum, movie) => sum + new Date(movie.created_at).getTime(), 0) / 
        moviesWithSlugs.filter(m => m.created_at).length;
      
      console.log(`📊 Average creation date (movies with slugs): ${new Date(avgDateWithSlugs).toLocaleDateString()}`);
    }

  } catch (error) {
    console.error('Error in analysis:', error);
  }
}

checkSlugAgeCorrelation()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(console.error);