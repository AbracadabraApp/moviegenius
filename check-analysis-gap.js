#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAnalysisGap() {
  console.log('🔍 Checking analysis to nuclear conversion gap...\n');
  
  try {
    // Get all movies with analysis
    let allAnalyzedMovies = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('movie_analyses')
        .select('movie_id, movies!inner(tmdb_id, title, year)')
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
    
    console.log(`📊 Found ${allAnalyzedMovies.length} movies with analysis`);
    
    // Check which ones have nuclear static files
    const nuclearDir = path.join(__dirname, 'nuclear-static');
    let nuclearFiles = [];
    
    if (fs.existsSync(nuclearDir)) {
      nuclearFiles = fs.readdirSync(nuclearDir)
        .filter(f => f.endsWith('.json'))
        .map(f => parseInt(f.replace('.json', '')));
    }
    
    console.log(`🚀 Found ${nuclearFiles.length} nuclear static files`);
    
    // Find movies with analysis but no nuclear file
    const missingNuclear = allAnalyzedMovies.filter(movie => {
      const tmdbId = movie.movies.tmdb_id;
      return !nuclearFiles.includes(tmdbId);
    });
    
    console.log(`\n📋 MOVIES WITH ANALYSIS BUT NO NUCLEAR STATIC FILE:`);
    console.log(`Total: ${missingNuclear.length}`);
    
    if (missingNuclear.length > 0) {
      console.log(`\nFirst 25 candidates for nuclear conversion:`);
      missingNuclear.slice(0, 25).forEach((movie, index) => {
        console.log(`${index + 1}. ${movie.movies.title} (${movie.movies.year}) - TMDB: ${movie.movies.tmdb_id}`);
      });
    }
    
    // Summary statistics
    const analysisCount = allAnalyzedMovies.length;
    const nuclearCount = nuclearFiles.length;
    const gapCount = missingNuclear.length;
    
    console.log(`\n=== CONVERSION SUMMARY ===`);
    console.log(`Movies with analysis: ${analysisCount}`);
    console.log(`Nuclear static files: ${nuclearCount}`);
    console.log(`Movies needing nuclear conversion: ${gapCount}`);
    console.log(`Conversion rate: ${((nuclearCount / analysisCount) * 100).toFixed(1)}%`);
    
    // Show TMDB IDs for scripting
    if (missingNuclear.length > 0) {
      const tmdbIds = missingNuclear.slice(0, 50).map(m => m.movies.tmdb_id);
      console.log(`\nTMDB IDs for next 50 candidates (for scripting):`);
      console.log(tmdbIds.join(', '));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAnalysisGap().catch(console.error);