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
  console.log('🔍 Testing current database state...');

  // Test 1: Check if UUID movies from backup exist in current database
  const backupMovieIds = [
    '1516db96-f862-4f8f-a57e-13e5c13cf297',
    '4c926c1c-1599-47fd-a91b-0f8cd60f1125', 
    'faf6b1ce-6992-4bfc-963a-b4b6ef7f9551'
  ];

  console.log('\n📊 Checking if backup movies exist in current database:');
  for (const movieId of backupMovieIds) {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('id', movieId)
      .single();

    if (data) {
      console.log(`✅ Found: ${data.title} (${data.year}) - TMDB: ${data.tmdb_id}`);
    } else {
      console.log(`❌ Not found: ${movieId}`);
    }
  }

  // Test 2: Check current analysis count
  const { count: currentAnalyses } = await supabase
    .from('movie_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_type', 'page_analysis');

  console.log(`\n📊 Current analyses in database: ${currentAnalyses}`);

  // Test 3: Check movie schema
  const { data: sampleMovies } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n📋 Sample current movies:');
  sampleMovies?.forEach((movie, i) => {
    console.log(`${i+1}. ${movie.title} (${movie.year}) - ID: ${movie.id} - TMDB: ${movie.tmdb_id}`);
  });
}

testDatabase().catch(console.error);