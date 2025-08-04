#!/usr/bin/env node
/**
 * Query Movie Analysis Coverage
 * 
 * This script provides comprehensive counts for:
 * 1. Total movies in the database
 * 2. Movies that have been processed (have analysis entries)
 * 3. Movies that have NEVER been processed (no analysis entries)
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getAnalysisCounts() {
  console.log('📊 Movie Analysis Coverage Report');
  console.log('==================================\n');

  try {
    // 1. Count total movies in the movies table
    console.log('🔄 Counting total movies...');
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // 2. Count total analysis entries (analysis_type = 'page_analysis')
    console.log('🔄 Counting total analysis entries...');
    const { count: totalAnalysisEntries, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    if (analysisError) throw analysisError;

    // 3. Get distinct movie IDs that have analysis entries
    console.log('🔄 Getting distinct movies with analysis...');
    const { data: moviesWithAnalysis, error: distinctError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (distinctError) throw distinctError;

    // Create set to get unique movie IDs that have analysis
    const uniqueAnalyzedMovieIds = new Set(moviesWithAnalysis.map(a => a.movie_id));
    const moviesWithAnalysisCount = uniqueAnalyzedMovieIds.size;

    // 4. Calculate movies that have NEVER been analyzed
    const moviesNeverAnalyzed = totalMovies - moviesWithAnalysisCount;

    // 5. Additional stats - movies with TMDB data
    console.log('🔄 Counting movies with TMDB data...');
    const { count: moviesWithTMDB, error: tmdbError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    if (tmdbError) throw tmdbError;

    // 6. Check for movies with multiple analysis entries
    const analysisEntryCountMap = {};
    moviesWithAnalysis.forEach(a => {
      analysisEntryCountMap[a.movie_id] = (analysisEntryCountMap[a.movie_id] || 0) + 1;
    });

    const moviesWithMultipleAnalyses = Object.values(analysisEntryCountMap)
      .filter(count => count > 1).length;

    // Display comprehensive report
    console.log('\n📈 COMPREHENSIVE ANALYSIS REPORT');
    console.log('=====================================\n');

    console.log('🎬 MOVIE DATABASE OVERVIEW:');
    console.log(`   • Total movies in database: ${totalMovies.toLocaleString()}`);
    console.log(`   • Movies with TMDB data: ${moviesWithTMDB.toLocaleString()} (${((moviesWithTMDB/totalMovies)*100).toFixed(1)}%)`);
    console.log(`   • Movies without TMDB data: ${(totalMovies - moviesWithTMDB).toLocaleString()}\n`);

    console.log('🔬 ANALYSIS PROCESSING STATUS:');
    console.log(`   • Total analysis entries: ${totalAnalysisEntries.toLocaleString()}`);
    console.log(`   • Unique movies with analysis: ${moviesWithAnalysisCount.toLocaleString()}`);
    console.log(`   • Movies with multiple analyses: ${moviesWithMultipleAnalyses.toLocaleString()}`);
    console.log(`   • Movies NEVER analyzed: ${moviesNeverAnalyzed.toLocaleString()}\n`);

    console.log('📊 PROCESSING PERCENTAGES:');
    console.log(`   • Movies analyzed: ${((moviesWithAnalysisCount/totalMovies)*100).toFixed(1)}%`);
    console.log(`   • Movies never analyzed: ${((moviesNeverAnalyzed/totalMovies)*100).toFixed(1)}%`);
    
    if (moviesWithTMDB > 0) {
      const tmdbAnalyzed = Math.min(moviesWithAnalysisCount, moviesWithTMDB);
      const tmdbUnanalyzed = moviesWithTMDB - tmdbAnalyzed;
      console.log(`   • TMDB movies analyzed: ${((tmdbAnalyzed/moviesWithTMDB)*100).toFixed(1)}%`);
      console.log(`   • TMDB movies unanalyzed: ${tmdbUnanalyzed.toLocaleString()} (${((tmdbUnanalyzed/moviesWithTMDB)*100).toFixed(1)}%)`);
    }

    console.log('\n🎯 KEY INSIGHTS:');
    if (moviesNeverAnalyzed > moviesWithAnalysisCount) {
      console.log(`   • MORE movies need analysis (${moviesNeverAnalyzed.toLocaleString()}) than have been processed (${moviesWithAnalysisCount.toLocaleString()})`);
    } else {
      console.log(`   • MORE movies have been processed (${moviesWithAnalysisCount.toLocaleString()}) than need analysis (${moviesNeverAnalyzed.toLocaleString()})`);
    }

    if (totalAnalysisEntries > moviesWithAnalysisCount) {
      const avgAnalysesPerMovie = (totalAnalysisEntries / moviesWithAnalysisCount).toFixed(1);
      console.log(`   • Average analyses per movie: ${avgAnalysesPerMovie} (indicating some re-processing)`);
    }

    console.log('\n✅ Analysis complete!');

    return {
      totalMovies,
      moviesWithAnalysisCount,
      moviesNeverAnalyzed,
      totalAnalysisEntries,
      moviesWithTMDB,
      moviesWithMultipleAnalyses
    };

  } catch (error) {
    console.error('\n❌ Error querying analysis counts:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    throw error;
  }
}

// Run the analysis
getAnalysisCounts()
  .then((stats) => {
    console.log('\n🏁 Query completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Query failed:', error.message);
    process.exit(1);
  });