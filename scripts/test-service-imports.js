#!/usr/bin/env node
/**
 * Test Service Import Debug Tool
 * Tests the exact dynamic imports failing in production movie-analysis API
 */

const PRODUCTION_URL = 'https://moviegenius.ai';

async function testServiceImports() {
  console.log('🔍 Testing Service Import Failures');
  console.log('==================================\n');

  // Test 1: Direct TMDB service import test via API
  console.log('1. Testing TMDB service import via production API...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/test-tmdb-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'import' })
    });
    
    const data = await response.json();
    console.log(`   Response: ${response.status} - ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   ❌ Test endpoint error: ${error.message}`);
  }

  // Test 2: Direct analysis API call with detailed logging
  console.log('\n2. Testing analysis API with verbose logging...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/movie-analysis?tmdbId=257&debug=true`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${data.error}`);
    console.log(`   Details: ${data.details}`);
    console.log(`   TMDB ID: ${data.tmdbId}`);
  } catch (error) {
    console.log(`   ❌ Analysis API error: ${error.message}`);
  }

  // Test 3: Check if service files exist in production build
  console.log('\n3. Testing service file accessibility...');
  const serviceFiles = [
    '/api/check-file?path=lib/services/tmdb-search.js',
    '/api/check-file?path=lib/services/database-search.js'
  ];

  for (const path of serviceFiles) {
    try {
      const response = await fetch(`${PRODUCTION_URL}${path}`);
      const data = await response.json();
      console.log(`   ${path}: ${response.status} - ${data.exists ? '✅ Exists' : '❌ Missing'}`);
    } catch (error) {
      console.log(`   ${path}: ❌ Check failed - ${error.message}`);
    }
  }
}

// Run the test
testServiceImports().catch(console.error);