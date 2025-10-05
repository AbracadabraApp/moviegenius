#!/usr/bin/env node
/**
 * Test Movie Pages 101-200 on Development Server
 * Validates page assembly for a range of movie IDs using dev server
 * Run: node --env-file=.env.local test-movie-pages-101-200.cjs
 */

const { Pool } = require('pg');

async function testMoviePages101To200() {
  console.log('🎬 Testing Movie Pages 101-200 on Development Server...\n');

  const baseURL = 'http://localhost:3002'; // Updated to current dev server port
  const startId = 101;
  const endId = 200;

  // First, check what movies exist in this range
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3
  });

  try {
    console.log('📊 Checking which movies exist in range 101-200...');

    const client = await pool.connect();
    const moviesResult = await client.query(`
      SELECT tmdb_id, title, year
      FROM movies
      WHERE tmdb_id BETWEEN $1 AND $2
      ORDER BY tmdb_id
    `, [startId, endId]);

    const existingMovies = moviesResult.rows;
    console.log(`Found ${existingMovies.length} movies in range ${startId}-${endId}:`);

    if (existingMovies.length === 0) {
      console.log('❌ No movies found in this range. Try a different range.');
      return;
    }

    // Show first few movies
    existingMovies.slice(0, 10).forEach(movie => {
      console.log(`   ${movie.tmdb_id}: ${movie.title} (${movie.year})`);
    });

    if (existingMovies.length > 10) {
      console.log(`   ... and ${existingMovies.length - 10} more`);
    }

    console.log(`\n🧪 Testing page assembly for ${existingMovies.length} movies...\n`);

    // Test page loading for each movie
    const results = {
      successful: [],
      failed: [],
      errors: []
    };

    for (let i = 0; i < existingMovies.length; i++) {
      const movie = existingMovies[i];
      const progress = `[${i + 1}/${existingMovies.length}]`;

      try {
        console.log(`${progress} Testing ${movie.title} (ID: ${movie.tmdb_id})...`);

        const startTime = Date.now();
        const response = await fetch(`${baseURL}/movie/${movie.tmdb_id}`);
        const loadTime = Date.now() - startTime;

        if (response.ok) {
          const html = await response.text();
          const pageValidation = validateMoviePageHTML(html, movie);

          results.successful.push({
            tmdbId: movie.tmdb_id,
            title: movie.title,
            loadTime,
            validation: pageValidation
          });

          const status = pageValidation.score >= 0.8 ? '✅' : pageValidation.score >= 0.5 ? '⚠️' : '❌';
          console.log(`   ${status} Loaded in ${loadTime}ms - Score: ${(pageValidation.score * 100).toFixed(0)}%`);

          // Show component status with green/red indicators
          console.log(`   Components: ${pageValidation.componentStatus}`);

          if (pageValidation.issues.length > 0) {
            console.log(`   Issues: ${pageValidation.issues.join(', ')}`);
          }

        } else {
          results.failed.push({
            tmdbId: movie.tmdb_id,
            title: movie.title,
            status: response.status,
            statusText: response.statusText
          });

          console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        results.errors.push({
          tmdbId: movie.tmdb_id,
          title: movie.title,
          error: error.message
        });

        console.log(`   💥 Error: ${error.message}`);
      }

      // Small delay to avoid overwhelming the server
      if (i < existingMovies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    client.release();

    // Print comprehensive summary
    printTestSummary(results, existingMovies.length);

    return results;

  } finally {
    await pool.end();
  }
}

/**
 * Validate movie page HTML for key components
 */
function validateMoviePageHTML(html, movie) {
  const issues = [];
  let score = 1.0;

  // Check for movie title
  if (!html.includes(movie.title)) {
    issues.push('Movie title not found in page');
    score -= 0.2;
  }

  // Check for movie year
  if (!html.includes(movie.year.toString())) {
    issues.push('Movie year not found in page');
    score -= 0.1;
  }

  // Check for key page components - all features should show if present, degrade gracefully if missing
  const components = [
    { name: 'Header', pattern: /MovieHeaderLarge|movie-header/i, weight: 0.125 },
    { name: 'Streaming', pattern: /StreamingAvailabilityLink|streaming.*data/i, weight: 0.125 },
    { name: 'Trailer', pattern: /trailerVideoId|youtube\.com|youtu\.be|PlayCircle/i, weight: 0.125 },
    { name: 'Analysis', pattern: /MovieAnalysisWithEntities|subhead|analysis/i, weight: 0.125 },
    { name: 'WhyWatch', pattern: /why.*watch|recommendation/i, weight: 0.125 },
    { name: 'MovieLinks', pattern: /class="movie-title"|data-tmdb-id/i, weight: 0.125 },
    { name: 'Contributors', pattern: /MovieCreativeFooter|director|writer|star|cast/i, weight: 0.125 },
    { name: 'MoreIdeas', pattern: /more.*ideas|similar.*movies/i, weight: 0.125 }
  ];

  const componentStatuses = [];
  components.forEach(component => {
    const found = component.pattern.test(html);

    // Determine status: Green (working), Yellow (no data), Red (error)
    let status;
    if (found) {
      status = '🟢'; // Working
    } else {
      // Check if it's missing due to no data vs error
      if (component.name === 'Streaming' && !html.includes('streaming')) {
        status = '🟡'; // No streaming data available
      } else if (component.name === 'Trailer' && html.includes('trailerVideoId":null')) {
        status = '🟡'; // No trailer in database
      } else if (component.name === 'Contributors' && html.includes('Loading contributors')) {
        status = '🔴'; // Error - should have loaded by now
      } else {
        status = '🔴'; // Error - should be present but isn't
      }
      issues.push(`Missing ${component.name}`);
      score -= component.weight;
    }

    componentStatuses.push(`${component.name}=${status}`);
  });

  const componentStatus = componentStatuses.join(' ');

  // Check for React hydration errors
  if (html.includes('Hydration failed') || html.includes('hydration error')) {
    issues.push('Hydration errors detected');
    score -= 0.3;
  }

  // Check for error boundaries
  if (html.includes('Something went wrong') || html.includes('Error Boundary')) {
    issues.push('Error boundary triggered');
    score -= 0.5;
  }

  // Check page isn't just a loading state
  if (html.includes('Loading...') && html.length < 5000) {
    issues.push('Page appears to be stuck in loading state');
    score -= 0.4;
  }

  return {
    score: Math.max(0, score),
    issues,
    componentStatus,
    htmlLength: html.length,
    hasTrailer: /trailerVideoId|youtube\.com|youtu\.be/.test(html),
    hasAnalysis: /analysis|subhead/i.test(html),
    hasLinks: /class="movie-title"|data-tmdb-id/.test(html)
  };
}

/**
 * Print comprehensive test summary
 */
function printTestSummary(results, totalMovies) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 MOVIE PAGES 101-200 TEST SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n📊 Overall Results:`);
  console.log(`   ✅ Successful: ${results.successful.length}/${totalMovies} (${(results.successful.length/totalMovies*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${results.failed.length}/${totalMovies}`);
  console.log(`   💥 Errors: ${results.errors.length}/${totalMovies}`);

  if (results.successful.length > 0) {
    const avgScore = results.successful.reduce((sum, r) => sum + r.validation.score, 0) / results.successful.length;
    const avgLoadTime = results.successful.reduce((sum, r) => sum + r.loadTime, 0) / results.successful.length;

    console.log(`\n⚡ Performance:`);
    console.log(`   Average load time: ${avgLoadTime.toFixed(0)}ms`);
    console.log(`   Average quality score: ${(avgScore * 100).toFixed(1)}%`);

    // Component analysis
    const componentStats = {
      hasTrailer: results.successful.filter(r => r.validation.hasTrailer).length,
      hasAnalysis: results.successful.filter(r => r.validation.hasAnalysis).length,
      hasLinks: results.successful.filter(r => r.validation.hasLinks).length
    };

    console.log(`\n🧩 Component Coverage:`);
    console.log(`   Trailers: ${componentStats.hasTrailer}/${results.successful.length} (${(componentStats.hasTrailer/results.successful.length*100).toFixed(1)}%)`);
    console.log(`   Analysis: ${componentStats.hasAnalysis}/${results.successful.length} (${(componentStats.hasAnalysis/results.successful.length*100).toFixed(1)}%)`);
    console.log(`   Movie Links: ${componentStats.hasLinks}/${results.successful.length} (${(componentStats.hasLinks/results.successful.length*100).toFixed(1)}%)`);
  }

  // Show failed pages
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed Pages:`);
    results.failed.slice(0, 5).forEach(failure => {
      console.log(`   ${failure.tmdbId}: ${failure.title} - HTTP ${failure.status}`);
    });
    if (results.failed.length > 5) {
      console.log(`   ... and ${results.failed.length - 5} more`);
    }
  }

  // Show error pages
  if (results.errors.length > 0) {
    console.log(`\n💥 Error Pages:`);
    results.errors.slice(0, 5).forEach(error => {
      console.log(`   ${error.tmdbId}: ${error.title} - ${error.error}`);
    });
    if (results.errors.length > 5) {
      console.log(`   ... and ${results.errors.length - 5} more`);
    }
  }

  // Top performers
  if (results.successful.length > 0) {
    const topPerformers = results.successful
      .filter(r => r.validation.score >= 0.9)
      .sort((a, b) => b.validation.score - a.validation.score)
      .slice(0, 5);

    if (topPerformers.length > 0) {
      console.log(`\n⭐ Top Performers:`);
      topPerformers.forEach(performer => {
        const score = (performer.validation.score * 100).toFixed(0);
        console.log(`   ${performer.tmdbId}: ${performer.title} - ${score}% (${performer.loadTime}ms)`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));

  const successRate = results.successful.length / totalMovies;
  if (successRate >= 0.9) {
    console.log('🎉 EXCELLENT: Movie pages are loading reliably!');
  } else if (successRate >= 0.7) {
    console.log('✅ GOOD: Most movie pages are working well');
  } else if (successRate >= 0.5) {
    console.log('⚠️  FAIR: Some issues need attention');
  } else {
    console.log('❌ POOR: Significant issues with movie page loading');
  }
}

// Run test
if (require.main === module) {
  testMoviePages101To200()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testMoviePages101To200 };