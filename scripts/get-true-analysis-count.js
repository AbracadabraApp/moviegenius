#!/usr/bin/env node
/**
 * Get TRUE count of movies needing analysis (without Supabase 1000 limit)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function getTrueAnalysisCount() {
  console.log('📊 Getting TRUE Analysis Counts (bypassing 1000 limit)');
  console.log('======================================================\n');

  try {
    // Total movies (using count, not limited)
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Movies with TMDB data (using count)
    const { count: moviesWithTMDB, error: tmdbError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    if (tmdbError) throw tmdbError;

    // Total analysis entries (using count)
    const { count: totalAnalyses, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    if (analysisError) throw analysisError;

    // Estimate unique movies with analysis (conservative)
    // Since we can't easily get distinct count due to limits, estimate
    const estimatedUniqueAnalyzed = Math.min(totalAnalyses, moviesWithTMDB);
    
    // Movies needing analysis = Movies with TMDB - Movies with analysis
    const moviesNeedingAnalysis = moviesWithTMDB - estimatedUniqueAnalyzed;

    console.log(`📈 TRUE Database Counts:`);
    console.log(`  • Total movies: ${totalMovies.toLocaleString()}`);
    console.log(`  • Movies with TMDB data: ${moviesWithTMDB.toLocaleString()}`);
    console.log(`  • Total analysis entries: ${totalAnalyses.toLocaleString()}`);
    console.log(`  • Estimated unique movies analyzed: ${estimatedUniqueAnalyzed.toLocaleString()}`);
    console.log(`  • Movies needing analysis: ${moviesNeedingAnalysis.toLocaleString()}`);

    // Cost calculation for TRUE batch processing
    const tokensPerMovie = 2970; // From previous analysis
    const totalTokens = moviesNeedingAnalysis * tokensPerMovie;
    const inputTokens = moviesNeedingAnalysis * 950; // ~950 input tokens per movie
    const outputTokens = moviesNeedingAnalysis * 2020; // ~2020 output tokens per movie

    // TRUE Batch API pricing (50% discount)
    const inputCost = (inputTokens / 1000000) * 1.50; // $1.50/MTok (50% off $3.00)
    const outputCost = (outputTokens / 1000000) * 7.50; // $7.50/MTok (50% off $15.00)
    const totalCost = inputCost + outputCost;

    // Regular API cost for comparison
    const regularInputCost = (inputTokens / 1000000) * 3.00;
    const regularOutputCost = (outputTokens / 1000000) * 15.00;
    const regularTotalCost = regularInputCost + regularOutputCost;

    console.log(`\n💰 TRUE Batch API Cost Analysis:`);
    console.log(`  • Input tokens: ${(inputTokens / 1000000).toFixed(1)}M × $1.50 = $${inputCost.toFixed(2)}`);
    console.log(`  • Output tokens: ${(outputTokens / 1000000).toFixed(1)}M × $7.50 = $${outputCost.toFixed(2)}`);
    console.log(`  • **Total with TRUE 50% batch discount: $${totalCost.toFixed(2)}**`);
    console.log(`  • Regular API cost would be: $${regularTotalCost.toFixed(2)}`);
    console.log(`  • TRUE savings: $${(regularTotalCost - totalCost).toFixed(2)} (50%)`);

    console.log(`\n⏱️ Processing Estimates:`);
    console.log(`  • Batch size: ${Math.min(moviesNeedingAnalysis, 10000).toLocaleString()} per batch`);
    console.log(`  • Number of batches needed: ${Math.ceil(moviesNeedingAnalysis / 10000)}`);
    console.log(`  • Processing time per batch: ~1 hour`);
    console.log(`  • Total estimated time: ${Math.ceil(moviesNeedingAnalysis / 10000)} hours`);

    console.log(`\n🎯 Summary:`);
    if (moviesNeedingAnalysis > 10000) {
      console.log(`  • LARGE SCALE: ${moviesNeedingAnalysis.toLocaleString()} movies need analysis`);
      console.log(`  • Recommend processing in batches of 1,000-5,000`);
      console.log(`  • Total cost: $${totalCost.toFixed(2)} with TRUE batch discount`);
    } else {
      console.log(`  • MANAGEABLE SCALE: ${moviesNeedingAnalysis.toLocaleString()} movies need analysis`);
      console.log(`  • Can process in 1-2 batches`);
      console.log(`  • Total cost: $${totalCost.toFixed(2)} with TRUE batch discount`);
    }

    return {
      totalMovies,
      moviesWithTMDB,
      totalAnalyses,
      moviesNeedingAnalysis,
      totalCost,
      batchesNeeded: Math.ceil(moviesNeedingAnalysis / 10000)
    };

  } catch (error) {
    console.error('❌ Error getting true counts:', error.message);
    throw error;
  }
}

// Run the count check
getTrueAnalysisCount()
  .then((stats) => {
    console.log('\n✅ TRUE analysis count complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Count check failed:', error.message);
    process.exit(1);
  });