#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateNuclearConversionReport() {
  console.log('📊 Nuclear Conversion Analysis Report\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. Get all movies with analysis
    console.log('🔍 Step 1: Fetching movies with analysis...');
    let allAnalyzedMovies = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('movie_analyses')
        .select(`
          movie_id, 
          created_at, 
          claude_response,
          movies!inner(tmdb_id, title, year, created_at)
        `)
        .eq('analysis_type', 'page_analysis')
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Database error:', error);
        return;
      }
      
      if (!batch || batch.length === 0) break;
      
      allAnalyzedMovies = allAnalyzedMovies.concat(batch);
      offset += limit;
      
      if (batch.length < limit) break;
    }
    
    console.log(`   Found ${allAnalyzedMovies.length} movies with analysis`);
    
    // 2. Check nuclear static files
    console.log('🚀 Step 2: Checking nuclear static files...');
    const nuclearDir = path.join(__dirname, 'nuclear-static');
    let nuclearFiles = [];
    
    if (fs.existsSync(nuclearDir)) {
      nuclearFiles = fs.readdirSync(nuclearDir)
        .filter(f => f.endsWith('.json'))
        .map(f => parseInt(f.replace('.json', '')));
    }
    
    console.log(`   Found ${nuclearFiles.length} nuclear static files`);
    
    // 3. Get nuclear candidates (top 1000 movies)
    console.log('🎯 Step 3: Identifying nuclear candidates...');
    const { data: nuclearCandidates, error: candidatesError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, created_at')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);
      
    if (candidatesError) {
      console.error('Error fetching nuclear candidates:', candidatesError);
      return;
    }
    
    console.log(`   Found ${nuclearCandidates.length} nuclear candidates`);
    
    // 4. Analysis by category
    console.log('\n📋 ANALYSIS BY CATEGORY:');
    console.log('─'.repeat(40));
    
    // Category 1: Movies with analysis but no nuclear file
    const missingNuclear = allAnalyzedMovies.filter(movie => {
      const tmdbId = movie.movies.tmdb_id;
      return !nuclearFiles.includes(tmdbId);
    });
    
    console.log(`\n1️⃣ Movies with analysis but NO nuclear static file:`);
    console.log(`   Count: ${missingNuclear.length}`);
    
    if (missingNuclear.length > 0) {
      console.log(`   Top 10 candidates:`);
      missingNuclear.slice(0, 10).forEach((movie, index) => {
        console.log(`     ${index + 1}. ${movie.movies.title} (${movie.movies.year}) - TMDB: ${movie.movies.tmdb_id}`);
      });
    }
    
    // Category 2: Nuclear candidates without analysis
    const candidateIds = nuclearCandidates.map(c => c.id);
    const analyzedMovieIds = allAnalyzedMovies.map(m => m.movie_id);
    
    const candidatesNeedingAnalysis = nuclearCandidates.filter(candidate => {
      return !analyzedMovieIds.includes(candidate.id);
    });
    
    console.log(`\n2️⃣ Nuclear candidates WITHOUT analysis:`);
    console.log(`   Count: ${candidatesNeedingAnalysis.length}`);
    
    if (candidatesNeedingAnalysis.length > 0) {
      console.log(`   Top 10 candidates:`);
      candidatesNeedingAnalysis.slice(0, 10).forEach((movie, index) => {
        console.log(`     ${index + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
      });
    }
    
    // Category 3: Complete nuclear movies (analysis + static file)
    const completeNuclear = allAnalyzedMovies.filter(movie => {
      const tmdbId = movie.movies.tmdb_id;
      return nuclearFiles.includes(tmdbId);
    });
    
    console.log(`\n3️⃣ Complete nuclear movies (analysis + static file):`);
    console.log(`   Count: ${completeNuclear.length}`);
    
    // Summary statistics
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log('─'.repeat(40));
    console.log(`Total movies with analysis: ${allAnalyzedMovies.length}`);
    console.log(`Total nuclear static files: ${nuclearFiles.length}`);
    console.log(`Total nuclear candidates: ${nuclearCandidates.length}`);
    console.log(`Complete nuclear movies: ${completeNuclear.length}`);
    console.log(`Movies needing nuclear conversion: ${missingNuclear.length}`);
    console.log(`Candidates needing analysis: ${candidatesNeedingAnalysis.length}`);
    
    const overallConversionRate = (completeNuclear.length / Math.max(allAnalyzedMovies.length, nuclearCandidates.length)) * 100;
    console.log(`Overall nuclear completion rate: ${overallConversionRate.toFixed(1)}%`);
    
    // Action items
    console.log(`\n🎯 RECOMMENDED ACTIONS:`);
    console.log('─'.repeat(40));
    
    if (missingNuclear.length > 0) {
      console.log(`\n1. Convert ${missingNuclear.length} analyzed movies to nuclear static:`);
      console.log(`   Command: node scripts/nuclear-static-generator.js --tmdb-ids=${missingNuclear.slice(0, 20).map(m => m.movies.tmdb_id).join(',')}`);
    }
    
    if (candidatesNeedingAnalysis.length > 0) {
      console.log(`\n2. Generate analysis for ${candidatesNeedingAnalysis.length} nuclear candidates:`);
      console.log(`   Command: node scripts/batch-analysis-generator.js --tmdb-ids=${candidatesNeedingAnalysis.slice(0, 20).map(m => m.tmdb_id).join(',')}`);
    }
    
    // Export data for scripts
    console.log(`\n📁 EXPORT DATA FOR SCRIPTING:`);
    console.log('─'.repeat(40));
    
    if (missingNuclear.length > 0) {
      const missingNuclearIds = missingNuclear.map(m => m.movies.tmdb_id);
      console.log(`\nMissing nuclear TMDB IDs (${missingNuclearIds.length}):`);
      console.log(missingNuclearIds.join(', '));
    }
    
    if (candidatesNeedingAnalysis.length > 0) {
      const needingAnalysisIds = candidatesNeedingAnalysis.map(m => m.tmdb_id);
      console.log(`\nNeed analysis TMDB IDs (${needingAnalysisIds.length}):`);
      console.log(needingAnalysisIds.join(', '));
    }
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalWithAnalysis: allAnalyzedMovies.length,
        totalNuclearFiles: nuclearFiles.length,
        totalNuclearCandidates: nuclearCandidates.length,
        completeNuclear: completeNuclear.length,
        missingNuclear: missingNuclear.length,
        needingAnalysis: candidatesNeedingAnalysis.length,
        conversionRate: overallConversionRate
      },
      missingNuclearIds: missingNuclear.map(m => m.movies.tmdb_id),
      needingAnalysisIds: candidatesNeedingAnalysis.map(m => m.tmdb_id),
      missingNuclearMovies: missingNuclear.map(m => ({
        tmdbId: m.movies.tmdb_id,
        title: m.movies.title,
        year: m.movies.year,
        analysisDate: m.created_at
      })),
      needingAnalysisMovies: candidatesNeedingAnalysis.map(m => ({
        tmdbId: m.tmdb_id,
        title: m.title,
        year: m.year,
        createdAt: m.created_at
      }))
    };
    
    fs.writeFileSync('nuclear-conversion-report.json', JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Report saved to: nuclear-conversion-report.json`);
    
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

generateNuclearConversionReport().catch(console.error);