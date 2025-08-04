#!/usr/bin/env node

/**
 * EMERGENCY FIX: Zero-Waste Protection System
 * 
 * This script diagnoses and fixes the root cause of movie pages 
 * regenerating analysis in development.
 * 
 * PROBLEM: Missing database columns prevent zero-waste protection
 * SOLUTION: Add completion tracking columns and update existing records
 */

import { createClient } from '@supabase/supabase-js';

async function diagnoseAndFix() {
  console.log('🚨 EMERGENCY FIX: Zero-Waste Protection System');
  console.log('================================================\n');
  
  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 STEP 1: Diagnosing the problem...\n');

  // Test if the problematic columns exist
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('id, has_linked_analysis, analysis_completed_at')
      .limit(1);
      
    if (error) {
      if (error.message.includes('column "has_linked_analysis" does not exist')) {
        console.log('❌ CONFIRMED: Missing has_linked_analysis column');
        console.log('❌ CONFIRMED: This is why every page regenerates analysis\n');
        
        console.log('📋 MANUAL FIX REQUIRED:');
        console.log('=====================================');
        console.log('Please run these SQL commands in your Supabase dashboard:\n');
        
        console.log('-- Add completion tracking columns to movies table');
        console.log('ALTER TABLE movies ');
        console.log('ADD COLUMN IF NOT EXISTS has_linked_analysis BOOLEAN DEFAULT FALSE,');
        console.log('ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP,');
        console.log('ADD COLUMN IF NOT EXISTS nuclear_static_completed_at TIMESTAMP,');
        console.log('ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP;\n');
        
        console.log('-- Add completion tracking columns to movie_analyses table');
        console.log('ALTER TABLE movie_analyses ');
        console.log('ADD COLUMN IF NOT EXISTS has_links BOOLEAN DEFAULT FALSE,');
        console.log('ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP,');
        console.log('ADD COLUMN IF NOT EXISTS link_count INTEGER DEFAULT 0;\n');
        
        console.log('-- Update existing complete analyses');
        console.log('UPDATE movies ');
        console.log('SET has_linked_analysis = TRUE, analysis_completed_at = NOW()');
        console.log('WHERE EXISTS (');
        console.log('  SELECT 1 FROM movie_analyses ');
        console.log('  WHERE movie_analyses.movie_id = movies.id ');
        console.log('    AND analysis_type = \'page_analysis\'');
        console.log('    AND claude_response->>\'raw_content\' IS NOT NULL');
        console.log(');\n');
        
        console.log('🚀 After running these commands, the zero-waste protection will work!');
        console.log('✅ Movies with existing analysis will be marked as complete');
        console.log('✅ New movie pages will skip regeneration for existing content');
        
        return;
      } else {
        throw error;
      }
    }
    
    console.log('✅ Columns exist - checking data integrity...');
    console.log('Sample record:', data[0]);
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    return;
  }
  
  console.log('\n🔍 STEP 2: Checking completion status...\n');
  
  // Check how many movies have analyses but aren't marked as complete
  try {
    const { data: incompleteMovies, error } = await supabase
      .rpc('incomplete_analysis_count', {});
      
    if (error) {
      // Fall back to manual query
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select(`
          id, 
          title, 
          has_linked_analysis,
          movie_analyses!inner(claude_response)
        `)
        .eq('has_linked_analysis', false)
        .eq('movie_analyses.analysis_type', 'page_analysis')
        .not('movie_analyses.claude_response', 'is', null)
        .limit(10);
        
      if (moviesError) {
        console.error('❌ Error checking completion status:', moviesError.message);
        return;
      }
      
      console.log(`📊 Found ${movies.length} movies with analysis but not marked complete`);
      if (movies.length > 0) {
        console.log('Sample incomplete movies:');
        movies.slice(0, 3).forEach(movie => {
          console.log(`  - ${movie.title} (ID: ${movie.id})`);
        });
      }
      
      if (movies.length > 0) {
        console.log('\n🔧 STEP 3: Fixing completion status...\n');
        console.log('Run this SQL to mark existing analyses as complete:\n');
        
        console.log('UPDATE movies ');
        console.log('SET has_linked_analysis = TRUE, analysis_completed_at = NOW(), last_processed_at = NOW()');
        console.log('WHERE EXISTS (');
        console.log('  SELECT 1 FROM movie_analyses ');
        console.log('  WHERE movie_analyses.movie_id = movies.id ');
        console.log('    AND analysis_type = \'page_analysis\'');
        console.log('    AND claude_response->>\'raw_content\' IS NOT NULL');
        console.log('    AND LENGTH(claude_response->>\'raw_content\') > 1000');
        console.log(');\n');
        
        console.log('UPDATE movie_analyses ');
        console.log('SET has_links = TRUE, linked_at = NOW(), link_count = 1');
        console.log('WHERE analysis_type = \'page_analysis\'');
        console.log('  AND claude_response->>\'raw_content\' IS NOT NULL');
        console.log('  AND LENGTH(claude_response->>\'raw_content\') > 1000;\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking completion status:', error.message);
  }
  
  console.log('🎯 SUMMARY:');
  console.log('===========');
  console.log('The zero-waste protection system requires database columns that are missing.');
  console.log('Run the SQL commands above to fix the issue.');
  console.log('After the fix, movie pages will stop regenerating analysis unnecessarily.\n');
}

// Test a specific movie to see the issue in action
async function testSpecificMovie(tmdbId) {
  console.log(`\n🧪 TESTING MOVIE ${tmdbId} ANALYSIS BEHAVIOR:\n`);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Check if movie exists and has analysis
    const { data: movie, error } = await supabase
      .from('movies')
      .select(`
        id,
        title,
        year,
        has_linked_analysis,
        movie_analyses(claude_response)
      `)
      .eq('tmdb_id', tmdbId)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .single();
      
    if (error || !movie) {
      console.log(`❌ Movie ${tmdbId} not found in database`);
      return;
    }
    
    console.log(`📽️ Movie: ${movie.title} (${movie.year})`);
    console.log(`🔍 Has Analysis: ${movie.movie_analyses.length > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Marked Complete: ${movie.has_linked_analysis ? 'YES' : 'NO'}`);
    
    if (movie.movie_analyses.length > 0 && !movie.has_linked_analysis) {
      console.log(`🚨 PROBLEM: This movie has analysis but isn't marked complete!`);
      console.log(`💸 WASTE: Every page load will regenerate analysis (~$0.10 each time)`);
    } else if (movie.movie_analyses.length > 0 && movie.has_linked_analysis) {
      console.log(`✅ GOOD: This movie is properly protected from regeneration`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing movie ${tmdbId}:`, error.message);
  }
}

// Run the diagnosis
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseAndFix()
    .then(() => {
      // Test with a popular movie
      return testSpecificMovie(550); // Fight Club
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { diagnoseAndFix };