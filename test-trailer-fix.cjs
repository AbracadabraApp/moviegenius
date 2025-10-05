#!/usr/bin/env node
/**
 * Test trailer API fix - verifies unique trailers for different movies
 * Run: node --env-file=.env.local test-trailer-fix.cjs
 */

// Use Node.js built-in fetch (available in Node 18+)

async function testTrailerFix() {
  console.log('🎬 Testing trailer API fix...');

  // Start development server or use existing one
  const baseURL = 'http://localhost:3000';

  try {
    console.log('📡 Testing unique trailers for different movies...');

    // Test known movies that should have different trailers
    const testMovies = [
      { tmdbId: 550, title: 'Fight Club' },
      { tmdbId: 18, title: 'The Fifth Element' },
      { tmdbId: 78, title: 'Blade Runner' }
    ];

    const trailerResults = [];

    for (const movie of testMovies) {
      const response = await fetch(`${baseURL}/api/tmdb-trailer?tmdbId=${movie.tmdbId}`);

      if (response.status !== 200) {
        console.error(`❌ API error for ${movie.title}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      trailerResults.push({
        title: movie.title,
        tmdbId: movie.tmdbId,
        videoId: data.videoId,
        source: data.source,
        error: data.error
      });

      console.log(`   ${movie.title}: ${data.videoId || 'None'} (${data.source || 'error'})`);
    }

    // Verify uniqueness
    const videoIds = trailerResults
      .map(r => r.videoId)
      .filter(id => id); // Remove null/undefined

    const uniqueVideoIds = [...new Set(videoIds)];

    console.log(`\n📊 Results: ${videoIds.length} total trailers, ${uniqueVideoIds.length} unique`);

    if (videoIds.length > 0 && uniqueVideoIds.length === videoIds.length) {
      console.log('✅ SUCCESS: All trailers are unique - fix confirmed!');
      return { success: true, uniqueTrailers: true };
    } else if (uniqueVideoIds.length < videoIds.length) {
      console.log('❌ ISSUE: Some trailers are duplicated');
      return { success: false, uniqueTrailers: false };
    } else {
      console.log('⚠️  No trailers found to test');
      return { success: false, uniqueTrailers: null };
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
if (require.main === module) {
  testTrailerFix()
    .then(result => {
      console.log('\n🏁 Test Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { testTrailerFix };