// scripts/clean-tmdb-summaries.js
// Clean TMDB summaries from database slug fields

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanTmdbSummaries() {
  console.log('🧹 Cleaning TMDB summaries from database...');
  
  // Get all movies with slugs
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title, year, slug')
    .not('slug', 'is', null);
    
  if (error) {
    console.error('Error fetching movies:', error);
    return;
  }
  
  console.log(`Found ${movies.length} movies with slugs`);
  
  // Identify TMDB summaries (long, plot-like descriptions)
  const tmdbSummaries = movies.filter(movie => {
    const slug = movie.slug;
    return slug && (
      slug.length > 100 || // Very long descriptions
      slug.includes('A ') && slug.includes(' who ') || // TMDB plot patterns
      slug.includes('An ') && slug.includes(' who ') ||
      slug.includes('The story of') ||
      slug.includes('follows') ||
      slug.includes('Plot:') ||
      slug.includes('Overview:') ||
      slug.includes('Synopsis:') ||
      slug.includes('Summary:')
    );
  });
  
  console.log(`\n🔍 Found ${tmdbSummaries.length} potential TMDB summaries:`);
  tmdbSummaries.slice(0, 10).forEach(movie => {
    console.log(`- ${movie.title} (${movie.year}): ${movie.slug.substring(0, 80)}...`);
  });
  
  if (tmdbSummaries.length > 10) {
    console.log(`... and ${tmdbSummaries.length - 10} more`);
  }
  
  // Option to clear them
  console.log(`\n💡 To clean these, set slug to null for TMDB summary entries`);
  console.log(`   This allows Claude-generated slugs to be created organically`);
  
  return tmdbSummaries;
}

cleanTmdbSummaries().catch(console.error);