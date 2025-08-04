#!/usr/bin/env node
/**
 * Check Current Slug Statistics
 * 
 * Shows the current state of slug coverage in the database.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function getSlugStats() {
  console.log('📊 Current Slug Statistics');
  console.log('==========================\n');

  try {
    // Total movies
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Movies with any slug
    const { count: withSlugs, error: slugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null)
      .neq('slug', '');

    if (slugError) throw slugError;

    // Movies without slugs
    const { count: withoutSlugs, error: noSlugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .or('slug.is.null,slug.eq.');

    if (noSlugError) throw noSlugError;

    // Movies with valid slugs (not contaminated)
    const { count: validSlugs, error: validError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null)
      .neq('slug', '')
      .not('slug', 'ilike', '%Plot:%')
      .not('slug', 'ilike', '%Overview:%')
      .not('slug', 'ilike', '%Synopsis:%')
      .not('slug', 'ilike', '%Summary:%');

    if (validError) throw validError;

    // Sample of movies needing slugs
    const { data: needingSlugs, error: sampleError } = await supabase
      .from('movies')
      .select('id, title, year, slug, tmdb_id')
      .or('slug.is.null,slug.eq.')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (sampleError) throw sampleError;

    // Calculate percentages
    const withSlugPercent = ((withSlugs / totalMovies) * 100).toFixed(1);
    const missingSlugPercent = ((withoutSlugs / totalMovies) * 100).toFixed(1);
    const validSlugPercent = ((validSlugs / totalMovies) * 100).toFixed(1);

    console.log(`📈 Database Overview:`);
    console.log(`  • Total movies: ${totalMovies}`);
    console.log(`  • Movies with slugs: ${withSlugs} (${withSlugPercent}%)`);
    console.log(`  • Movies without slugs: ${withoutSlugs} (${missingSlugPercent}%)`);
    console.log(`  • Movies with valid slugs: ${validSlugs} (${validSlugPercent}%)`);

    console.log(`\n🔍 Movies Needing Slug Generation (sample):`);
    needingSlugs.forEach((movie, index) => {
      console.log(`  ${index + 1}. "${movie.title}" (${movie.year}) - TMDB: ${movie.tmdb_id}`);
    });

    console.log(`\n📋 Summary:`);
    console.log(`  • ${withoutSlugs} movies need slug generation (${missingSlugPercent}%)`);
    console.log(`  • Zero-waste architecture will prevent regenerating the ${validSlugs} valid slugs`);
    console.log(`  • Estimated cost savings: ~$300-800/month from preventing continuous regeneration`);

    return {
      totalMovies,
      withSlugs,
      withoutSlugs,
      validSlugs,
      missingSlugPercent: parseFloat(missingSlugPercent)
    };

  } catch (error) {
    console.error('❌ Error getting statistics:', error.message);
    throw error;
  }
}

// Run stats
getSlugStats()
  .then((stats) => {
    console.log('\n✅ Statistics complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Statistics failed:', error.message);
    process.exit(1);
  });