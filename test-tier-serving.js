#!/usr/bin/env node
/**
 * Test 2-Tier Serving Logic
 * Verifies the tier selection works as expected
 */

async function testTierServing() {
  console.log(`🎯 Testing 2-Tier Serving Logic`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Movie with enhanced static (should be Tier 1)
    console.log('\n🟢 TEST 1: Movie 550 (Fight Club) - Should use TIER 1');
    const enhancedResponse = await fetch(`http://localhost:3000/data/production/movie_550.json`);
    if (enhancedResponse.ok) {
      console.log('✅ Enhanced static file exists');
      const data = await enhancedResponse.json();
      console.log(`📊 Enhanced Format: ${data.enhancedFormat}`);
    } else {
      console.log('❌ Enhanced static file missing');
    }
    
    // Test 2: Movie without enhanced static (should fallback)
    console.log('\n🟡 TEST 2: Movie 153 (Test Movie) - Should use TIER 2A/2B');
    const noEnhancedResponse = await fetch(`http://localhost:3000/data/production/movie_153.json`);
    if (noEnhancedResponse.ok) {
      console.log('❌ Unexpected: Enhanced static exists for 153');
    } else {
      console.log('✅ No enhanced static file (expected fallback)');
    }
    
    // Test 3: Check if current static files exist
    console.log('\n🔵 TEST 3: Checking current static file availability');
    const currentStaticResponse = await fetch(`http://localhost:3000/nuclear-static/550.json`);
    if (currentStaticResponse.ok) {
      console.log('✅ Current static format available for 550');
    } else {
      console.log('⚠️  No current static format for 550');
    }
    
    // Test 4: API endpoints are working
    console.log('\n🟣 TEST 4: Checking API fallback endpoints');
    const tmdbResponse = await fetch(`http://localhost:3000/api/tmdb-movie?id=550`);
    if (tmdbResponse.ok) {
      console.log('✅ TMDB API endpoint working');
    } else {
      console.log('❌ TMDB API endpoint failed');
    }
    
    const analysisResponse = await fetch(`http://localhost:3000/api/movie-analysis?tmdbId=550`);
    if (analysisResponse.ok) {
      console.log('✅ Analysis API endpoint working');
    } else {
      console.log('⚠️  Analysis API endpoint failed (may be expected)');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 2-Tier Serving Test Complete');
  console.log('\n📋 Expected Behavior:');
  console.log('  • Movie 550: TIER 1 (Enhanced static, zero API calls)');
  console.log('  • Other movies: TIER 2A (Current static) or 2B (Dynamic)');
  console.log('\n🌐 Visit http://localhost:3000/movie/550 to see it in action!');
}

testTierServing();