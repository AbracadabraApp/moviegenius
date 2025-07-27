#!/usr/bin/env node

/**
 * Fix Analysis Flags Script
 * 
 * Updates has_analysis flags for movies that were archived but still 
 * have the flag set to true, preventing nuclear script from processing them.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔧 Fixing Analysis Flags for Archived Movies');
  console.log('');

  try {
    // Get all movies that claim to have analysis
    console.log('📊 Checking movies with has_analysis = true...');
    const { data: moviesWithFlags } = await supabase
      .from('movies')
      .select('id, title, year, has_analysis')
      .eq('has_analysis', true);
      
    console.log(`Found ${moviesWithFlags?.length || 0} movies claiming to have analysis`);
    
    if (!moviesWithFlags || moviesWithFlags.length === 0) {
      console.log('✅ No movies found with analysis flags');
      process.exit(0);
    }

    // Check which ones actually have analysis in batches
    console.log('🔍 Checking which movies actually have analysis...');
    let actualAnalysisIds = new Set();
    const batchSize = 100; // Smaller batches for Supabase limits
    
    for (let i = 0; i < moviesWithFlags.length; i += batchSize) {
      const batch = moviesWithFlags.slice(i, i + batchSize);
      const movieIds = batch.map(m => m.id);
      
      const { data: analyses } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .in('movie_id', movieIds);
        
      if (analyses) {
        analyses.forEach(a => actualAnalysisIds.add(a.movie_id));
      }
      
      console.log(`Checked ${Math.min((i + 1) * batchSize, moviesWithFlags.length)}/${moviesWithFlags.length} movies`);
    }
    
    // Find orphaned movies (have flag but no analysis)
    const orphanedMovies = moviesWithFlags.filter(m => !actualAnalysisIds.has(m.id));
    
    console.log(`\n📋 Found ${orphanedMovies.length} movies with flags but no analysis`);
    
    if (orphanedMovies.length === 0) {
      console.log('✅ All movies with flags actually have analysis');
      process.exit(0);
    }

    // Show samples
    console.log('\nSample orphaned movies:');
    orphanedMovies.slice(0, 5).forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year})`);
    });

    // Update flags
    console.log(`\n🔧 Updating ${orphanedMovies.length} movies...`);
    let updated = 0;
    
    for (let i = 0; i < orphanedMovies.length; i += batchSize) {
      const batch = orphanedMovies.slice(i, i + batchSize);
      const movieIds = batch.map(m => m.id);
      
      const { error } = await supabase
        .from('movies')
        .update({
          has_analysis: false,
          has_linked_analysis: false,
          analysis_completed_at: null,
          last_processed_at: null
        })
        .in('id', movieIds);
        
      if (error) {
        console.error('❌ Update error:', error);
        process.exit(1);
      }
      
      updated += batch.length;
      console.log(`✅ Updated ${updated}/${orphanedMovies.length} movies`);
    }
    
    console.log(`\n🎉 Successfully updated ${updated} movies!`);
    console.log('🚀 Nuclear script should now detect these movies for processing');
    console.log('\nNext: Run node scripts/nuclear-batch.js --count 7000');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();