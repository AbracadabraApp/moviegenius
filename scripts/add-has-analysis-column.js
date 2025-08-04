#!/usr/bin/env node
/**
 * Add has_analysis column to movies table using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addHasAnalysisColumn() {
  console.log('🚀 Adding has_analysis column to movies table...');
  
  try {
    // Step 1: Add the has_analysis column
    console.log('📝 Adding has_analysis column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE movies ADD COLUMN IF NOT EXISTS has_analysis BOOLEAN DEFAULT FALSE;'
    });
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError);
      return;
    }
    
    console.log('✅ has_analysis column added successfully');
    
    // Step 2: Update existing movies that have analyses
    console.log('📝 Updating movies that already have analyses...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE movies 
        SET has_analysis = TRUE 
        WHERE id IN (
          SELECT DISTINCT movie_id 
          FROM movie_analyses 
          WHERE analysis_type = 'page_analysis'
        );
      `
    });
    
    if (updateError) {
      console.error('❌ Error updating existing movies:', updateError);
      return;
    }
    
    console.log('✅ Updated existing movies with analyses');
    
    // Step 3: Get counts
    console.log('📊 Getting statistics...');
    const { data: stats, error: statsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_movies,
          SUM(CASE WHEN has_analysis = TRUE THEN 1 ELSE 0 END) as movies_with_analysis,
          SUM(CASE WHEN has_analysis = FALSE THEN 1 ELSE 0 END) as movies_needing_analysis
        FROM movies;
      `
    });
    
    if (statsError) {
      console.error('❌ Error getting statistics:', statsError);
      return;
    }
    
    console.log('📈 Database Statistics:');
    console.log(`   Total movies: ${stats[0].total_movies}`);
    console.log(`   Movies with analysis: ${stats[0].movies_with_analysis}`);
    console.log(`   Movies needing analysis: ${stats[0].movies_needing_analysis}`);
    
    // Step 4: Show sample movies needing analysis
    console.log('🎬 Sample movies needing analysis (batch candidates):');
    const { data: samples, error: sampleError } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, has_analysis')
      .eq('has_analysis', false)
      .order('tmdb_id')
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Error getting samples:', sampleError);
      return;
    }
    
    samples.forEach(movie => {
      console.log(`   TMDB ${movie.tmdb_id}: ${movie.title} (${movie.year})`);
    });
    
    console.log('🎉 has_analysis column setup complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
addHasAnalysisColumn();