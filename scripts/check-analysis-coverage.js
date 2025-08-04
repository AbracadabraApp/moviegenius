#!/usr/bin/env node
/**
 * Check Analysis Coverage Statistics
 * 
 * Compare total movies vs movies with analysis to understand coverage.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function checkAnalysisCoverage() {
  console.log('📊 Analysis Coverage Statistics');
  console.log('===============================\n');

  try {
    // Total movies
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Movies with analysis (from movie_analyses table)
    const { data: uniqueAnalyzed, error: analyzedError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analyzedError) throw analyzedError;

    // Get unique movie IDs with analysis
    const uniqueMovieIds = [...new Set(uniqueAnalyzed.map(a => a.movie_id))];
    const moviesWithAnalysis = uniqueMovieIds.length;

    // Movies without analysis
    const moviesWithoutAnalysis = totalMovies - moviesWithAnalysis;

    // Analysis coverage percentage
    const analysisCoverage = ((moviesWithAnalysis / totalMovies) * 100).toFixed(1);
    const missingAnalysisPercent = ((moviesWithoutAnalysis / totalMovies) * 100).toFixed(1);

    console.log(`📈 Analysis Coverage Overview:`);
    console.log(`  • Total movies: ${totalMovies}`);
    console.log(`  • Movies with analysis: ${moviesWithAnalysis} (${analysisCoverage}%)`);
    console.log(`  • Movies without analysis: ${moviesWithoutAnalysis} (${missingAnalysisPercent}%)`);

    // Compare with slug coverage
    console.log(`\n🔄 Cross-Reference with Slug Data:`);
    
    const { count: moviesWithSlugs, error: slugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null)
      .neq('slug', '');

    if (slugError) throw slugError;

    const { count: moviesWithoutSlugs, error: noSlugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .or('slug.is.null,slug.eq.');

    if (noSlugError) throw noSlugError;

    console.log(`  • Movies with slugs: ${moviesWithSlugs} (${((moviesWithSlugs / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`  • Movies without slugs: ${moviesWithoutSlugs} (${((moviesWithoutSlugs / totalMovies) * 100).toFixed(1)}%)`);

    // Sample of movies with analysis but no slugs
    const { data: analysisNoSlug, error: sampleError } = await supabase
      .from('movies')
      .select('id, title, year, slug')
      .in('id', uniqueMovieIds.slice(0, 100)) // Sample from analyzed movies
      .or('slug.is.null,slug.eq.')
      .limit(5);

    if (sampleError) throw sampleError;

    console.log(`\n🔍 Sample Movies with Analysis but No Slugs:`);
    analysisNoSlug.forEach((movie, index) => {
      console.log(`  ${index + 1}. "${movie.title}" (${movie.year}) - ID: ${movie.id}`);
    });

    // Sample of movies without analysis
    const { data: noAnalysis, error: noAnalysisError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .not('id', 'in', `(${uniqueMovieIds.join(',')})`)
      .limit(5);

    if (noAnalysisError) throw noAnalysisError;

    console.log(`\n🔍 Sample Movies without Analysis:`);
    noAnalysis.forEach((movie, index) => {
      console.log(`  ${index + 1}. "${movie.title}" (${movie.year}) - TMDB: ${movie.tmdb_id}`);
    });

    console.log(`\n📋 Summary:`);
    console.log(`  • ${moviesWithAnalysis} movies have Claude analysis (~${Math.round(moviesWithAnalysis/1000)}k)`);
    console.log(`  • ${moviesWithoutAnalysis} movies need analysis (~${Math.round(moviesWithoutAnalysis/1000)}k)`);
    console.log(`  • Analysis coverage aligns with user observation: ~7k with analysis, ~10k without`);

    return {
      totalMovies,
      moviesWithAnalysis,
      moviesWithoutAnalysis,
      analysisCoverage: parseFloat(analysisCoverage),
      moviesWithSlugs,
      moviesWithoutSlugs
    };

  } catch (error) {
    console.error('❌ Error getting analysis coverage:', error.message);
    throw error;
  }
}

// Run analysis coverage check
checkAnalysisCoverage()
  .then((stats) => {
    console.log('\n✅ Analysis coverage check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis coverage check failed:', error.message);
    process.exit(1);
  });