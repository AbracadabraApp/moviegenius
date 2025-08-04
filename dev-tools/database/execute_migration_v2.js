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
    // First, let's check the current state
    console.log('Checking current database state...');
    
    // Get a sample movie to check if has_analysis column exists
    const { data: sampleMovies, error: sampleError } = await supabase
      .from('movies')
      .select('*')
      .limit(1);

    if (sampleError) {
      throw sampleError;
    }

    const hasAnalysisColumnExists = sampleMovies[0] && 'has_analysis' in sampleMovies[0];
    
    if (hasAnalysisColumnExists) {
      console.log('✅ has_analysis column already exists');
    } else {
      console.log('❌ has_analysis column does not exist');
      console.log('⚠️  Cannot add column via Supabase client - need to use SQL editor or migration');
      
      // Show what we would do
      console.log('\n📋 Manual steps needed:');
      console.log('1. Go to Supabase SQL Editor');
      console.log('2. Execute: ALTER TABLE movies ADD COLUMN has_analysis BOOLEAN DEFAULT FALSE;');
      console.log('3. Then run this script again to update the data');
      
      return;
    }

    // Step 2: Get all movies with analyses
    console.log('\nStep 2: Finding movies with existing analyses...');
    const { data: analysisMovies, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analysisError) {
      throw analysisError;
    }

    const movieIdsWithAnalysis = [...new Set(analysisMovies.map(a => a.movie_id))];
    console.log(`Found ${movieIdsWithAnalysis.length} unique movies with analyses`);

    // Step 3: Update movies to set has_analysis = true for those with analyses
    if (movieIdsWithAnalysis.length > 0) {
      console.log('\nStep 3: Updating movies with has_analysis = true...');
      
      // Process in batches of 100 to avoid hitting limits
      const batchSize = 100;
      let updated = 0;
      
      for (let i = 0; i < movieIdsWithAnalysis.length; i += batchSize) {
        const batch = movieIdsWithAnalysis.slice(i, i + batchSize);
        
        const { error: updateError } = await supabase
          .from('movies')
          .update({ has_analysis: true })
          .in('id', batch);

        if (updateError) {
          throw updateError;
        }
        
        updated += batch.length;
        console.log(`   Updated ${updated}/${movieIdsWithAnalysis.length} movies...`);
      }
      
      console.log('✅ Movies with analyses updated successfully');
    }

    // Step 4: Get verification stats
    console.log('\nStep 4: Verifying results...');
    const { data: allMovies, error: statsError } = await supabase
      .from('movies')
      .select('id, has_analysis');

    if (statsError) {
      throw statsError;
    }

    const totalMovies = allMovies.length;
    const moviesWithAnalysis = allMovies.filter(m => m.has_analysis).length;
    const moviesNeedingAnalysis = totalMovies - moviesWithAnalysis;

    console.log(`📊 Migration Results:`);
    console.log(`   Total movies: ${totalMovies}`);
    console.log(`   Movies with analysis: ${moviesWithAnalysis}`);
    console.log(`   Movies needing analysis: ${moviesNeedingAnalysis}`);
    console.log(`   Percentage with analysis: ${((moviesWithAnalysis / totalMovies) * 100).toFixed(1)}%`);

    // Step 5: Show sample of movies needing analysis
    console.log('\nStep 5: Sample movies needing analysis:');
    const { data: samples, error: samplesError } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, has_analysis')
      .eq('has_analysis', false)
      .not('tmdb_id', 'is', null)
      .order('tmdb_id')
      .limit(10);

    if (samplesError) {
      throw samplesError;
    }

    console.log('   Batch candidates (movies needing analysis):');
    samples.forEach(movie => {
      console.log(`   ${movie.tmdb_id}: "${movie.title}" (${movie.year})`);
    });

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

executeMigration();