#!/usr/bin/env node
/**
 * Deep Analysis Investigation
 * 
 * Investigates the discrepancy between expected 11K movies needing analysis
 * vs audit finding only 892. Checks for potential issues in audit logic.
 */

import { createClient } from '@supabase/supabase-js';

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DeepAnalysisInvestigator {
  async investigate() {
    console.log('🔬 Deep Analysis Investigation');
    console.log('==============================\n');

    await this.checkMovieAnalysisTypes();
    await this.checkUnanalyzedBreakdown(); 
    await this.validateCountMethods();
    await this.checkSpecificCases();
  }

  async checkMovieAnalysisTypes() {
    console.log('📊 Analysis Types in Database');
    console.log('-----------------------------');

    const { data: analysisTypes, error } = await supabase
      .from('movie_analyses')
      .select('analysis_type, count(*)')
      .group('analysis_type');

    if (error) {
      console.error('Error:', error);
      return;
    }

    // Manual count since group by might not work
    const { data: allAnalyses, error: allError } = await supabase
      .from('movie_analyses')
      .select('analysis_type');

    if (allError) {
      console.error('Error:', allError);
      return;
    }

    const typeCounts = {};
    allAnalyses.forEach(a => {
      typeCounts[a.analysis_type] = (typeCounts[a.analysis_type] || 0) + 1;
    });

    console.log('Analysis types found:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count.toLocaleString()}`);
    });
    console.log(`  • Total analyses: ${allAnalyses.length.toLocaleString()}\n`);
  }

  async checkUnanalyzedBreakdown() {
    console.log('🧮 Unanalyzed Movies Breakdown');
    console.log('------------------------------');

    // Method 1: Count all movies with TMDB but no analysis
    const { data: allMovies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, has_analysis')
      .not('tmdb_id', 'is', null);

    if (moviesError) {
      console.error('Error:', moviesError);
      return;
    }

    // Get all analysis movie IDs
    const { data: analysisRecords, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('movie_id, analysis_type');

    if (analysisError) {
      console.error('Error:', analysisError);
      return;
    }

    // Check different analysis types
    const movieAnalysisIds = new Set();
    const pageAnalysisIds = new Set();
    
    analysisRecords.forEach(record => {
      if (record.analysis_type === 'movie_analysis') {
        movieAnalysisIds.add(record.movie_id);
      }
      if (record.analysis_type === 'page_analysis') {
        pageAnalysisIds.add(record.movie_id);
      }
    });

    const moviesWithoutMovieAnalysis = allMovies.filter(m => !movieAnalysisIds.has(m.id));
    const moviesWithoutPageAnalysis = allMovies.filter(m => !pageAnalysisIds.has(m.id));
    const moviesWithoutAnyAnalysis = allMovies.filter(m => 
      !movieAnalysisIds.has(m.id) && !pageAnalysisIds.has(m.id)
    );

    console.log(`Total movies with TMDB: ${allMovies.length.toLocaleString()}`);
    console.log(`Movies without 'movie_analysis': ${moviesWithoutMovieAnalysis.length.toLocaleString()}`);
    console.log(`Movies without 'page_analysis': ${moviesWithoutPageAnalysis.length.toLocaleString()}`);
    console.log(`Movies without ANY analysis: ${moviesWithoutAnyAnalysis.length.toLocaleString()}`);
    
    // Check has_analysis flag distribution
    const flaggedTrue = allMovies.filter(m => m.has_analysis === true).length;
    const flaggedFalse = allMovies.filter(m => m.has_analysis === false).length;
    const flaggedNull = allMovies.filter(m => m.has_analysis === null).length;

    console.log(`\nhas_analysis flag distribution:`);
    console.log(`  • true: ${flaggedTrue.toLocaleString()}`);
    console.log(`  • false: ${flaggedFalse.toLocaleString()}`);
    console.log(`  • null: ${flaggedNull.toLocaleString()}\n`);
  }

  async validateCountMethods() {
    console.log('🔍 Validating Count Methods');
    console.log('---------------------------');

    // Method 1: Direct count
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    // Method 2: Analysis count by type
    const { count: movieAnalysisCount } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'movie_analysis');

    const { count: pageAnalysisCount } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    // Method 3: Flag-based count
    const { count: flaggedAsAnalyzed } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('has_analysis', true)
      .not('tmdb_id', 'is', null);

    console.log('Count validation:');
    console.log(`  • Total movies (TMDB): ${totalMovies?.toLocaleString()}`);
    console.log(`  • 'movie_analysis' records: ${movieAnalysisCount?.toLocaleString()}`);
    console.log(`  • 'page_analysis' records: ${pageAnalysisCount?.toLocaleString()}`);
    console.log(`  • Movies flagged analyzed: ${flaggedAsAnalyzed?.toLocaleString()}`);
    console.log(`  • Expected unanalyzed (by movie_analysis): ${(totalMovies - movieAnalysisCount)?.toLocaleString()}`);
    console.log(`  • Expected unanalyzed (by page_analysis): ${(totalMovies - pageAnalysisCount)?.toLocaleString()}\n`);
  }

  async checkSpecificCases() {
    console.log('🎯 Checking Specific Cases');
    console.log('--------------------------');

    // Check what the original movies-without-analysis.json contained
    const { data: sampleUnanalyzed, error } = await supabase
      .from('movies')
      .select(`
        id, title, year, tmdb_id, has_analysis,
        movie_analyses!left(id, analysis_type)
      `)
      .in('tmdb_id', [659959, 308191, 254128, 863, 67612]) // From original JSON
      .not('tmdb_id', 'is', null);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Sample from original movies-without-analysis.json:');
    sampleUnanalyzed.forEach(movie => {
      const analyses = movie.movie_analyses || [];
      const hasMovieAnalysis = analyses.some(a => a.analysis_type === 'movie_analysis');
      const hasPageAnalysis = analyses.some(a => a.analysis_type === 'page_analysis');
      
      console.log(`  • ${movie.title} (${movie.year}): flag=${movie.has_analysis}, movie_analysis=${hasMovieAnalysis}, page_analysis=${hasPageAnalysis}`);
    });
    console.log('');
  }
}

// Run investigation
if (import.meta.url === `file://${process.argv[1]}`) {
  const investigator = new DeepAnalysisInvestigator();
  
  investigator.investigate()
    .then(() => {
      console.log('✅ Investigation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Investigation failed:', error.message);
      process.exit(1);
    });
}