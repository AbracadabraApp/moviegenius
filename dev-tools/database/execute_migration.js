#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('🚀 Starting has_analysis column migration...\n');

  try {
    // Step 1: Add the has_analysis column
    console.log('Step 1: Adding has_analysis column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE movies ADD COLUMN has_analysis BOOLEAN DEFAULT FALSE;'
    });

    if (alterError && !alterError.message.includes('already exists')) {
      throw alterError;
    }
    console.log('✅ has_analysis column added successfully');

    // Step 2: Update existing movies that have analyses
    console.log('\nStep 2: Updating movies with existing analyses...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE movies 
            SET has_analysis = TRUE 
            WHERE id IN (
              SELECT DISTINCT movie_id 
              FROM movie_analyses 
              WHERE analysis_type = 'page_analysis'
            );`
    });

    if (updateError) {
      throw updateError;
    }
    console.log('✅ Movies with analyses updated successfully');

    // Step 3: Get verification stats
    console.log('\nStep 3: Verifying results...');
    const { data: stats, error: statsError } = await supabase
      .from('movies')
      .select('has_analysis');

    if (statsError) {
      throw statsError;
    }

    const totalMovies = stats.length;
    const moviesWithAnalysis = stats.filter(m => m.has_analysis).length;
    const moviesNeedingAnalysis = totalMovies - moviesWithAnalysis;

    console.log(`📊 Migration Results:`);
    console.log(`   Total movies: ${totalMovies}`);
    console.log(`   Movies with analysis: ${moviesWithAnalysis}`);
    console.log(`   Movies needing analysis: ${moviesNeedingAnalysis}`);

    // Step 4: Show sample of movies needing analysis
    console.log('\nStep 4: Sample movies needing analysis:');
    const { data: samples, error: samplesError } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, has_analysis')
      .eq('has_analysis', false)
      .order('tmdb_id')
      .limit(10);

    if (samplesError) {
      throw samplesError;
    }

    samples.forEach(movie => {
      console.log(`   ${movie.tmdb_id}: "${movie.title}" (${movie.year}) - ${movie.has_analysis ? 'HAS' : 'NEEDS'} analysis`);
    });

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

executeMigration();