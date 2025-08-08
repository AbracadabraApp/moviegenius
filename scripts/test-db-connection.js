#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('🔍 Clearing existing analysis for Double Indemnity (996)...');

  // Get movie info for Sunset Boulevard
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id')
    .eq('tmdb_id', 599)
    .single();

  if (!movie) {
    console.log('❌ Double Indemnity (996) not found in movies table');
    return;
  }

  console.log(`✅ Movie found: "${movie.title}" (${movie.year}) - Internal ID: ${movie.id}`);
  
  // Delete existing analyses for clean testing
  const { data: deletedAnalyses, error: deleteError } = await supabase
    .from('movie_analyses')
    .delete()
    .eq('movie_id', movie.id)
    .select('id, analysis_type');
  
  if (deleteError) {
    console.error('❌ Error deleting analyses:', deleteError);
  } else {
    console.log(`✅ Deleted ${deletedAnalyses?.length || 0} existing analyses`);
    deletedAnalyses?.forEach((analysis, i) => {
      console.log(`   ${i+1}. Deleted ${analysis.analysis_type} (${analysis.id})`);
    });
  }

  console.log('\n🧪 Ready for fresh JSON analysis test!');
}

testDatabase().catch(console.error);