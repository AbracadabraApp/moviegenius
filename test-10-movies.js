// Test 10 Movies - Bulk Content Generator
// Modified version to test first 10 movies with detailed progress dashboard

const fs = require('fs');

console.log('🎬 Test Bulk Movie Content Generator - First 10 Movies');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Configuration for testing
const CONFIG = {
  BASE_URL: 'https://moviegenius.ai',
  CONCURRENT_REQUESTS: 3,
  RATE_LIMIT_MS: 2000,
  RETRY_ATTEMPTS: 3,
  TEST_LIMIT: 10 // Only process first 10 movies
};

// Global state
let stats = {
  total: 0,
  completed: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
  estimatedCost: 0,
  errors: [],
  results: []
};

/**
 * Enhanced progress dashboard
 */
function showDetailedProgress() {
  const percent = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.completed / (elapsed / 1000);
  const eta = stats.total > stats.completed ? ((stats.total - stats.completed) / rate) : 0;
  
  const etaFormatted = eta > 3600 ? 
    `${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m` :
    eta > 60 ? `${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s` :
    `${Math.floor(eta)}s`;
  
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    📊 PROGRESS DASHBOARD                        │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Progress: ${stats.completed}/${stats.total} (${percent}%)`.padEnd(64) + '│');
  console.log(`│ ✅ Successful: ${stats.successful}`.padEnd(64) + '│');
  console.log(`│ ❌ Failed: ${stats.failed}`.padEnd(64) + '│');
  console.log(`│ ⏱️  Rate: ${rate.toFixed(1)}/sec`.padEnd(64) + '│');
  console.log(`│ 🕐 ETA: ${etaFormatted}`.padEnd(64) + '│');
  
  if (stats.estimatedCost > 0) {
    console.log(`│ 💰 Claude Cost: $${stats.estimatedCost.toFixed(4)}`.padEnd(64) + '│');
  }
  
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  // Show recent results
  if (stats.results.length > 0) {
    console.log('\n📋 Recent Results:');
    stats.results.slice(-3).forEach(result => {
      const status = result.success ? '✅' : '❌';
      const cost = result.cost ? ` ($${result.cost.toFixed(4)})` : '';
      console.log(`   ${status} ${result.tmdbId}: ${result.title || result.error}${cost}`);
    });
  }
}

/**
 * Load first 10 TMDB IDs for testing
 */
function loadTestTmdbIds() {
  try {
    console.log('\n📂 Loading first 10 TMDB IDs for testing...');
    
    const possibleFiles = [
      './missing-tmdb-ids.json',
      '../missing-tmdb-ids.json',
      './tmdb-ids.json'
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const allTmdbIds = data.missingIds || data.tmdb_ids || data || [];
        
        // Take only first 10 for testing
        const testIds = allTmdbIds.slice(0, CONFIG.TEST_LIMIT);
        
        console.log(`✅ Loaded first ${testIds.length} TMDB IDs from ${file}`);
        console.log(`📋 Test IDs: ${testIds.join(', ')}`);
        return testIds;
      }
    }
    
    throw new Error('No TMDB IDs file found');
  } catch (error) {
    console.error('❌ Failed to load TMDB IDs:', error.message);
    process.exit(1);
  }
}

/**
 * Enhanced API call with detailed logging
 */
async function generateMovieContent(tmdbId, index) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🔄 [${index + 1}/${stats.total}] Processing TMDB ID ${tmdbId}...`);
    
    const response = await fetch(`${CONFIG.BASE_URL}/api/load-movie-page`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Content-Generator/1.0'
      },
      body: JSON.stringify({ tmdb_id: parseInt(tmdbId) }),
      timeout: 30000
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      const movieTitle = data.movie?.title || 'Unknown';
      const movieYear = data.movie?.year || '';
      const cached = data.cached ? '(cached)' : '(fresh)';
      const cost = data.cost || 0;
      
      console.log(`   ✅ ${tmdbId}: "${movieTitle}" (${movieYear}) ${cached}`);
      console.log(`   ⏱️  Response time: ${responseTime}ms`);
      
      if (cost > 0) {
        stats.estimatedCost += cost;
        console.log(`   💰 Claude cost: $${cost.toFixed(4)}`);
      }
      
      // Check if analysis includes explore further topics
      if (data.analysis && data.analysis.includes('EXPLORE_FURTHER:')) {
        const topicCount = (data.analysis.match(/EXPLORE_FURTHER:/g) || []).length;
        console.log(`   🔍 Generated ${topicCount} explore further topics`);
      }
      
      const result = { 
        success: true, 
        tmdbId, 
        title: movieTitle, 
        year: movieYear, 
        cost, 
        responseTime,
        cached: data.cached
      };
      
      stats.results.push(result);
      return result;
      
    } else {
      throw new Error(data.error || 'Unknown API error');
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ ${tmdbId}: ${error.message} (${responseTime}ms)`);
    
    const result = { 
      success: false, 
      tmdbId, 
      error: error.message, 
      responseTime 
    };
    
    stats.results.push(result);
    return result;
  }
}

/**
 * Process test batch with enhanced monitoring
 */
async function processTestBatch(tmdbIds) {
  console.log(`\n🎯 Starting test processing of ${tmdbIds.length} movies...`);
  
  for (let i = 0; i < tmdbIds.length; i++) {
    const tmdbId = tmdbIds[i];
    
    const result = await generateMovieContent(tmdbId, i);
    
    if (result.success) {
      stats.successful++;
    } else {
      stats.failed++;
      stats.errors.push({ tmdbId: result.tmdbId, error: result.error });
    }
    stats.completed++;
    
    // Show progress after each movie
    showDetailedProgress();
    
    // Rate limiting (except for last movie)
    if (i < tmdbIds.length - 1) {
      console.log(`\n⏱️  Waiting ${CONFIG.RATE_LIMIT_MS / 1000}s before next movie...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
    }
  }
}

/**
 * Main execution with detailed reporting
 */
async function main() {
  try {
    console.log('🚀 Initializing test run...');
    
    const tmdbIds = loadTestTmdbIds();
    stats.total = tmdbIds.length;
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`   🌐 Base URL: ${CONFIG.BASE_URL}`);
    console.log(`   🔄 Rate limiting: ${CONFIG.RATE_LIMIT_MS}ms between requests`);
    console.log(`   🎯 Test limit: ${CONFIG.TEST_LIMIT} movies`);
    
    showDetailedProgress();
    
    await processTestBatch(tmdbIds);
    
    // Final detailed summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`🎬 Total movies processed: ${stats.total}`);
    console.log(`✅ Successfully processed: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    
    if (stats.estimatedCost > 0) {
      console.log(`💰 Total Claude API cost: $${stats.estimatedCost.toFixed(4)}`);
      console.log(`💡 Estimated full run cost: $${(stats.estimatedCost * (1957 / stats.successful)).toFixed(2)}`);
    }
    
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`🚀 Average rate: ${(stats.completed / totalTime).toFixed(2)} movies/second`);
    
    // Show all results
    console.log('\n📋 DETAILED RESULTS:');
    stats.results.forEach((result, i) => {
      const status = result.success ? '✅' : '❌';
      const title = result.success ? `"${result.title}" (${result.year})` : result.error;
      const cost = result.cost ? ` - $${result.cost.toFixed(4)}` : '';
      const cached = result.cached ? ' [CACHED]' : '';
      console.log(`   ${i + 1}. ${status} ${result.tmdbId}: ${title}${cost}${cached}`);
    });
    
    if (stats.failed > 0) {
      console.log('\n⚠️  FAILED MOVIES:');
      stats.errors.forEach(error => {
        console.log(`   🔴 ${error.tmdbId}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Test completed successfully!');
    
    if (stats.successful > 0) {
      console.log('\n🚀 NEXT STEPS:');
      console.log('   1. Review the success rate and performance');
      console.log('   2. Check a few generated movie pages for quality');
      console.log('   3. Run full bulk generation if results look good');
      console.log('   4. Consider adjusting rate limits based on performance');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

main();