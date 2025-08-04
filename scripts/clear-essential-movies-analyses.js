#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearEssentialMoviesAnalyses() {
  console.log('🧹 Clearing analyses for 49 essential movies...');

  // Read the test list (excluding 996 which we already tested)
  const testList = readFileSync(resolve(__dirname, '../PROMPT_C3_Test_LIST.txt'), 'utf-8')
    .split('\n')
    .map(id => id.trim())
    .filter(id => id && id !== '996');

  console.log(`📋 Processing ${testList.length} movies`);

  let cleared = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < testList.length; i++) {
    const tmdbId = testList[i];
    const progress = `[${i + 1}/${testList.length}]`;
    
    try {
      console.log(`${progress} Clearing TMDB ID: ${tmdbId}`);
      
      // Find movie in database
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year')
        .eq('tmdb_id', tmdbId)
        .single();

      if (!movie) {
        console.log(`⚠️  Movie ${tmdbId} not found in database`);
        notFound++;
        continue;
      }

      console.log(`✅ Found: "${movie.title}" (${movie.year})`);

      // Delete ALL analyses for this movie
      const { data: deletedAnalyses, error: deleteError } = await supabase
        .from('movie_analyses')
        .delete()
        .eq('movie_id', movie.id)
        .select('id, analysis_type');

      if (deleteError) {
        console.error(`❌ Error deleting analyses for ${tmdbId}:`, deleteError);
        errors++;
      } else {
        const count = deletedAnalyses?.length || 0;
        if (count > 0) {
          console.log(`🗑️  Deleted ${count} analyses`);
          cleared += count;
        } else {
          console.log(`📄 No existing analyses to delete`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to process ${tmdbId}:`, error.message);
      errors++;
    }
  }

  // Print summary
  console.log('\n🧹 CLEARING SUMMARY');
  console.log('==================');
  console.log(`🗑️  Analyses cleared: ${cleared}`);
  console.log(`⚠️  Movies not found: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total movies processed: ${testList.length}`);
  
  console.log('\n✅ Ready for fresh JSON generation!');
}

clearEssentialMoviesAnalyses().catch(console.error);