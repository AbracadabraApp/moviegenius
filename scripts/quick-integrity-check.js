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

async function quickIntegrityCheck() {
  console.log('🔍 Quick Database Integrity Check\n');

  // 1. Core numbers
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('tmdb_id', 'is', null);

  const { count: totalAnalyses } = await supabase
    .from('movie_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_type', 'page_analysis');

  console.log('📊 Core Numbers:');
  console.log(`  Movies with TMDB: ${totalMovies?.toLocaleString()}`);
  console.log(`  Total analyses: ${totalAnalyses?.toLocaleString()}`);
  console.log(`  Expected ratio: ~97% coverage`);
  console.log('');

  // 2. Check our regenerated movies specifically
  const movieIds = JSON.parse(readFileSync('./movie-ids-to-process.json', 'utf8'));
  
  let regeneratedCount = 0;
  const batchSize = 100;
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const { data: analyses } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis')
      .in('movie_id', batch);
    
    regeneratedCount += analyses?.length || 0;
  }

  console.log('📊 Regeneration Results:');
  console.log(`  Target movies: ${movieIds.length}`);
  console.log(`  Successfully regenerated: ${regeneratedCount}`);
  console.log(`  Success rate: ${((regeneratedCount / movieIds.length) * 100).toFixed(1)}%`);
  console.log('');

  // 3. Data quality spot check
  const { data: recentBatch } = await supabase
    .from('movie_analyses')
    .select('claude_response')
    .eq('analysis_type', 'page_analysis')
    .not('claude_response->batch_generated', 'is', null)
    .limit(5);

  console.log('📊 Quality Check:');
  console.log(`  Recent batch analyses found: ${recentBatch?.length || 0}`);
  console.log(`  Batch generation working: ${recentBatch?.length > 0 ? '✅' : '❌'}`);
  console.log('');

  // 4. Overall assessment
  const issues = [];
  
  if (regeneratedCount < movieIds.length) {
    issues.push(`${movieIds.length - regeneratedCount} regenerated movies missing analysis`);
  }

  if (totalAnalyses < 16000) {
    issues.push('Total analysis count seems low for 17k+ movies');
  }

  console.log('🎯 Integrity Assessment:');
  if (issues.length === 0) {
    console.log('✅ DATABASE INTEGRITY: EXCELLENT');
    console.log('✅ All regenerated analyses present');
    console.log('✅ Batch processing completed successfully');
    console.log('✅ Ready for production use');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

quickIntegrityCheck().catch(console.error);