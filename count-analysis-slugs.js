#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function countAnalysisMovies() {
  try {
    console.log('🔍 Counting movies with analysis and their slug status...');
    
    // Get movies that have analysis
    const { data: analysisMovieIds, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analysisError) throw analysisError;

    const uniqueMovieIds = [...new Set(analysisMovieIds.map(a => a.movie_id))];
    
    console.log(`📊 Found ${uniqueMovieIds.length} unique movies with analysis`);

    // Get movie details for those with analysis
    const { data: moviesWithAnalysis, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, slug')
      .in('id', uniqueMovieIds);

    if (movieError) throw movieError;

    const totalWithAnalysis = moviesWithAnalysis.length;
    const withSlugs = moviesWithAnalysis.filter(m => m.slug && m.slug.trim() !== '').length;
    const withoutSlugs = totalWithAnalysis - withSlugs;

    console.log('\n📈 RESULTS:');
    console.log('===============================');
    console.log(`Total movies with analysis: ${totalWithAnalysis}`);
    console.log(`- Movies with slugs: ${withSlugs} (${Math.round((withSlugs / totalWithAnalysis) * 100)}%)`);
    console.log(`- Movies without slugs: ${withoutSlugs} (${Math.round((withoutSlugs / totalWithAnalysis) * 100)}%)`);
    
    if (withoutSlugs > 0) {
      const estimatedCost = withoutSlugs * 0.01;
      console.log(`\n💰 Estimated cost to generate missing slugs: $${estimatedCost.toFixed(2)}`);
      console.log(`⏱️  Estimated time (at 1 slug/second): ${Math.ceil(withoutSlugs / 60)} minutes`);
    } else {
      console.log(`\n✅ All movies with analysis already have slugs!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

countAnalysisMovies();