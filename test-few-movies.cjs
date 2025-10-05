#!/usr/bin/env node
/**
 * Quick test of a few movie pages to verify dev server is working
 * Run: node --env-file=.env.local test-few-movies.cjs
 */

async function testFewMovies() {
  console.log('🎬 Testing a few movie pages on development server...\n');

  const baseURL = 'http://localhost:3002';
  const testMovies = [
    { tmdbId: 101, title: 'Léon: The Professional' },
    { tmdbId: 105, title: 'Back to the Future' },
    { tmdbId: 550, title: 'Fight Club' }
  ];

  for (const movie of testMovies) {
    try {
      console.log(`Testing ${movie.title} (ID: ${movie.tmdbId})...`);

      const startTime = Date.now();
      const response = await fetch(`${baseURL}/movie/${movie.tmdbId}`);
      const loadTime = Date.now() - startTime;

      if (response.ok) {
        const html = await response.text();

        // Basic validations
        const hasTitle = html.includes(movie.title);
        const hasMovieHeader = html.includes('MovieHeaderLarge') || html.includes('movie-header');
        const hasAnalysis = /analysis|subhead/i.test(html);
        const hasTrailer = /trailerVideoId|youtube\.com|youtu\.be/.test(html);
        const htmlSize = (html.length / 1024).toFixed(1);

        console.log(`   ✅ Loaded in ${loadTime}ms (${htmlSize}KB)`);
        console.log(`   📋 Components: Title=${hasTitle ? '✅' : '❌'}, Header=${hasMovieHeader ? '✅' : '❌'}, Analysis=${hasAnalysis ? '✅' : '❌'}, Trailer=${hasTrailer ? '✅' : '❌'}`);

        if (!hasTitle) {
          console.log(`   ⚠️  Warning: Movie title "${movie.title}" not found in HTML`);
        }

      } else {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }

    console.log(''); // Empty line
  }

  console.log('🎯 Quick test complete!');
}

// Run test
testFewMovies().catch(console.error);