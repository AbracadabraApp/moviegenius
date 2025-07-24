#!/usr/bin/env node
/**
 * Verify Movie Counts - Quick Check
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function verifyMovieCounts() {
  console.log('🔍 Quick Movie Count Verification\n');

  try {
    // Total movies count
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Total analysis entries count
    const { count: totalAnalysisEntries, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    if (analysisError) throw analysisError;

    // Unique movies with analysis
    const { data: analyzedMovies, error: uniqueError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (uniqueError) throw uniqueError;

    const uniqueAnalyzedMovies = [...new Set(analyzedMovies.map(a => a.movie_id))].length;
    const unprocessedMoviesCount = totalMovies - uniqueAnalyzedMovies;

    console.log('📊 Database Counts:');
    console.log(`   • Total movies: ${totalMovies.toLocaleString()}`);
    console.log(`   • Total analysis entries: ${totalAnalysisEntries.toLocaleString()}`);
    console.log(`   • Unique movies with analysis: ${uniqueAnalyzedMovies.toLocaleString()}`);
    console.log(`   • Movies without analysis: ${unprocessedMoviesCount.toLocaleString()}`);
    console.log(`   • Analysis coverage: ${((uniqueAnalyzedMovies/totalMovies)*100).toFixed(1)}%`);

    return {
      totalMovies,
      totalAnalysisEntries,
      uniqueAnalyzedMovies,
      unprocessedMoviesCount
    };

  } catch (error) {
    console.error('❌ Error verifying counts:', error.message);
    throw error;
  }
}

verifyMovieCounts()
  .then(() => {
    console.log('\n✅ Count verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });