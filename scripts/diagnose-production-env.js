#!/usr/bin/env node
/**
 * Production Environment Diagnostic Tool
 * Tests all the environment variables and API connections needed for movie analysis
 */

// Use Node.js built-in fetch (available in Node 18+)

const PRODUCTION_URL = 'https://moviegenius.ai';
const TEST_MOVIE_ID = 257; // Oliver Twist - we know this exists in TMDB

async function testEnvironmentConditions() {
  console.log('🔍 Production Environment Diagnostics');
  console.log('=====================================\n');

  const results = {
    tmdbApi: false,
    analysisApi: false,
    supabaseConnection: false,
    anthropicConnection: false
  };

  // Test 1: Basic TMDB API (should work)
  console.log('1. Testing TMDB API connection...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/tmdb-movie?id=${TEST_MOVIE_ID}`);
    const data = await response.json();
    
    if (response.ok && data.title) {
      console.log(`   ✅ TMDB API works: ${data.title} (${data.release_date?.substring(0, 4)})`);
      results.tmdbApi = true;
    } else {
      console.log(`   ❌ TMDB API failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ TMDB API error: ${error.message}`);
  }

  // Test 2: Analysis API (currently failing)
  console.log('\n2. Testing Analysis API...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/movie-analysis?tmdbId=${TEST_MOVIE_ID}`);
    const data = await response.json();
    
    if (response.ok && data.analysis) {
      console.log('   ✅ Analysis API works');
      results.analysisApi = true;
    } else {
      console.log(`   ❌ Analysis API failed: ${data.error || response.status}`);
      if (data.details) {
        console.log(`   📝 Details: ${data.details}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Analysis API error: ${error.message}`);
  }

  // Test 3: Health endpoint (if exists)
  console.log('\n3. Testing API health...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ Health endpoint responsive');
      if (data.database) {
        console.log(`   📊 Database: ${data.database}`);
        results.supabaseConnection = data.database === 'connected';
      }
      if (data.anthropic) {
        console.log(`   🤖 Anthropic: ${data.anthropic}`);
        results.anthropicConnection = data.anthropic === 'connected';
      }
    } else {
      console.log(`   ❌ Health endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Health endpoint not found: ${error.message}`);
  }

  // Test 4: Streaming data endpoint
  console.log('\n4. Testing streaming data API...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/movie-streaming?id=${TEST_MOVIE_ID}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Streaming API works');
    } else {
      console.log(`   ❌ Streaming API failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Streaming API error: ${error.message}`);
  }

  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log(`TMDB API:           ${results.tmdbApi ? '✅ Working' : '❌ Failed'}`);
  console.log(`Analysis API:       ${results.analysisApi ? '✅ Working' : '❌ Failed'}`);
  console.log(`Database Connection:${results.supabaseConnection ? '✅ Working' : '❌ Failed'}`);
  console.log(`Anthropic API:      ${results.anthropicConnection ? '✅ Working' : '❌ Failed'}`);

  // Diagnosis
  console.log('\n🩺 DIAGNOSIS');
  console.log('============');
  
  if (results.tmdbApi && !results.analysisApi) {
    console.log('💡 Pattern: TMDB works but Analysis fails');
    console.log('   This indicates an environment variable issue:');
    console.log('   - Check ANTHROPIC_API_KEY in production');
    console.log('   - Check SUPABASE_SERVICE_ROLE_KEY in production');
    console.log('   - Check NEXT_PUBLIC_SUPABASE_URL in production');
  } else if (!results.tmdbApi) {
    console.log('💡 Pattern: Complete API failure');
    console.log('   This indicates a deployment or hosting issue');
  } else {
    console.log('💡 All systems operational');
  }

  return results;
}

// Run diagnostics
testEnvironmentConditions().catch(console.error);