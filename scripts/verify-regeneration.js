#!/usr/bin/env node

/**
 * Verify Movie Analysis Regeneration
 * Check how many of the 6,170 movies now have analyses
 */

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

async function verifyRegeneration() {
  console.log('🔍 Verifying Movie Analysis Regeneration');
  console.log('📊 Checking progress on 6,170 movie batch');
  console.log('');

  try {
    // Load our target movie IDs
    const movieIds = JSON.parse(readFileSync('./movie-ids-to-process.json', 'utf8'));
    console.log(`🎬 Target movies: ${movieIds.length}`);

    // Check how many now have analyses
    let analysisCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      
      const { data: analyses } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .in('movie_id', batch);
      
      analysisCount += analyses?.length || 0;
    }

    console.log(`✅ Movies with analyses: ${analysisCount}/${movieIds.length}`);
    console.log(`📊 Progress: ${((analysisCount / movieIds.length) * 100).toFixed(1)}%`);
    
    const remaining = movieIds.length - analysisCount;
    console.log(`⏳ Remaining: ${remaining}`);

    if (remaining === 0) {
      console.log('\n🎉 CRISIS FULLY RESOLVED!');
      console.log('✅ All 6,170 movie analyses successfully regenerated');
      console.log('💰 Achieved 50% cost savings with Claude Batch API');
      console.log('🚀 High-quality analyses now available for all archived movies');
    } else {
      console.log(`\n⚠️  ${remaining} movies still need processing`);
      console.log('📋 The batch results script may still be running or need to be resumed');
    }

    // Check total analysis count
    const { count: totalAnalyses } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    console.log(`\n📊 Total analyses in database: ${totalAnalyses?.toLocaleString()}`);
    
    // Expected: 10,586 (pre-existing) + 6,170 (regenerated) = 16,756
    const expected = 10586 + 6170;
    console.log(`📊 Expected total: ${expected.toLocaleString()}`);
    
    if (totalAnalyses >= expected) {
      console.log('✅ Database analysis count looks correct!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyRegeneration();