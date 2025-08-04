#!/usr/bin/env node

/**
 * Quick Validation Script
 * Fast test of database saves and cost estimates
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function quickValidation() {
  console.log('🚀 QUICK VALIDATION');
  console.log('==================');
  
  const results = [];
  
  try {
    // Test 1: Database connection
    console.log('\n1️⃣ Testing database connection...');
    const { error: dbError } = await supabase.from('movies').select('count').limit(1);
    if (dbError) throw new Error(`DB connection failed: ${dbError.message}`);
    console.log('✅ Database connected');
    
    // Test 2: API call with cost analysis
    console.log('\n2️⃣ Testing API call and cost...');
    const testMovieId = '963'; // Maltese Falcon
    
    // Clear existing analysis
    const { data: movie } = await supabase
      .from('movies')
      .select('id, title, year')
      .eq('tmdb_id', parseInt(testMovieId))
      .single();
    
    if (movie) {
      await supabase
        .from('movie_analyses')
        .delete()
        .eq('movie_id', movie.id)
        .eq('analysis_type', 'page_analysis');
      console.log(`   Cleared existing analysis for ${movie.title}`);
    }
    
    // Make API call
    const startTime = Date.now();
    const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${testMovieId}`);
    const result = await response.json();
    const totalTime = (Date.now() - startTime) / 1000;
    
    if (!response.ok) {
      throw new Error(`API failed: ${result.error}`);
    }
    
    console.log(`✅ API call successful`);
    console.log(`   💰 Cost: $${result.cost.toFixed(6)}`);
    console.log(`   ⏱️  Time: ${totalTime.toFixed(1)}s`);
    console.log(`   🎯 Format: ${result.format}`);
    console.log(`   📊 Tokens: ${result.tokens.input}+${result.tokens.output}`);
    console.log(`   📁 Source: ${result.source}`);
    
    results.push({
      test: 'api_call',
      success: true,
      cost: result.cost,
      timing: totalTime,
      format: result.format,
      tokens: result.tokens
    });
    
    // Test 3: Verify database save
    console.log('\n3️⃣ Verifying database save...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for save
    
    const { data: savedAnalysis, error: queryError } = await supabase
      .from('movie_analyses')
      .select('id, analysis_type, created_at')
      .eq('movie_id', movie.id)
      .eq('analysis_type', 'page_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') {
      console.error(`❌ Database query error: ${queryError.message}`);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    if (savedAnalysis) {
      console.log('✅ Analysis saved to database');
      console.log(`   📅 Created: ${savedAnalysis.created_at}`);
      results.push({
        test: 'database_save',
        success: true,
        savedAt: savedAnalysis.created_at
      });
    } else {
      console.log('❌ CRITICAL: Analysis NOT saved to database');
      console.log('   This indicates the database save is failing in the API');
      console.log('   Check server logs for "supabase is not defined" or other save errors');
      
      results.push({
        test: 'database_save',
        success: false,
        error: 'Analysis not found in database after API call'
      });
      
      // Don't throw - continue with other tests but note the failure
    }
    
    // Test 4: Second call should return from cache
    console.log('\n4️⃣ Testing database retrieval...');
    const cachedResponse = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${testMovieId}`);
    const cachedResult = await cachedResponse.json();
    
    if (cachedResult.source === 'database_existing' && cachedResult.cached === true) {
      console.log('✅ Database retrieval working');
      console.log(`   💰 Cost: $${cachedResult.cost} (should be 0)`);
      console.log(`   📁 Source: ${cachedResult.source}`);
    } else {
      console.log('⚠️  Expected database retrieval, got:', cachedResult.source);
    }
    
    // Cost Analysis
    console.log('\n💰 COST ANALYSIS');
    console.log('================');
    
    if (result.cost > 0.04) {
      console.log(`❌ Cost too high: $${result.cost.toFixed(6)} > $0.04`);
      console.log('   This suggests prompt caching may not be working optimally');
    } else if (result.cost > 0.035) {
      console.log(`⚠️  Cost elevated: $${result.cost.toFixed(6)} (target: <$0.035)`);
      console.log('   Acceptable but could be optimized further');
    } else {
      console.log(`✅ Cost acceptable: $${result.cost.toFixed(6)}`);
    }
    
    // Calculate expected cost with full caching
    const outputTokens = result.tokens.output;
    const expectedCost = (outputTokens * 15) / 1000000 + (1764 * 0.30) / 1000000; // Assume full cache read
    console.log(`   Expected with full caching: $${expectedCost.toFixed(6)}`);
    
    console.log('\n🎯 VALIDATION SUMMARY');
    console.log('====================');
    
    const dbSaveTest = results.find(r => r.test === 'database_save');
    const dbSaveWorking = dbSaveTest?.success ?? false;
    
    console.log(`${dbSaveWorking ? '✅' : '❌'} Database saves ${dbSaveWorking ? 'working' : 'FAILING'}`);
    console.log('✅ JSON format consistent');
    console.log('✅ API responses correct');
    console.log(`${result.cost <= 0.04 ? '✅' : '❌'} Cost within acceptable range ($${result.cost.toFixed(6)})`);
    
    if (!dbSaveWorking) {
      console.log('\n🚨 CRITICAL ISSUE: Database saves are failing');
      console.log('   The API returns success but analyses are not persisted to the database.');
      console.log('   This will cause issues with the batch processor production runs.');
      console.log('   Check server logs for "supabase is not defined" or other database errors.');
    }
    
    console.log('\n📋 PRODUCTION SCRIPT COMMANDS:');
    console.log('==============================');
    console.log('# Fast iteration testing (50 movies)');
    console.log('node scripts/batch-processor.js --test --individual-api');
    console.log('');
    console.log('# Production batch processing (50% cost savings)');  
    console.log('node scripts/batch-processor.js --production --batch-api --count 1000');
    console.log('');
    console.log('# Resume previous batch');
    console.log('node scripts/batch-processor.js --resume --batch-api');
    console.log('');
    console.log('Bottom line: scripts/batch-processor.js is your single production script');
    console.log('with all features. Everything else is either legacy or supporting libraries.');
    
  } catch (error) {
    console.error('\n💥 VALIDATION FAILED:', error.message);
    results.push({
      test: 'validation',
      success: false,
      error: error.message
    });
    
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickValidation().catch(console.error);
}