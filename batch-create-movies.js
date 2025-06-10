// Step 3: Batch create missing movies using production API
const fs = require('fs');

console.log('🎬 Step 3: Batch Creating Missing Movies');

// Configuration
const BATCH_SIZE = 5; // Start small for testing
const DELAY_MS = 2000; // 2 seconds between requests
const DEFAULT_OFFSET = 0;

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    offset: DEFAULT_OFFSET,
    limit: BATCH_SIZE,
    baseUrl: 'https://moviegenius.ai'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--offset' && args[i + 1]) {
      config.offset = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      config.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--localhost') {
      config.baseUrl = 'http://localhost:3000';
    }
  }
  
  return config;
}

async function createMovie(tmdbId, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/create-media-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tmdb_id: tmdbId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.movie) {
      return {
        success: true,
        tmdbId: tmdbId,
        title: data.movie.title,
        year: data.movie.year,
        slug: data.movie.slug,
        source: data.source
      };
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    return {
      success: false,
      tmdbId: tmdbId,
      error: error.message
    };
  }
}

async function batchCreateMovies() {
  const config = parseArgs();
  
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Offset: ${config.offset}`);
  console.log(`   Batch Size: ${config.limit}`);
  console.log(`   Delay: ${DELAY_MS}ms between requests`);
  console.log('');
  
  try {
    // Read missing TMDB IDs
    const missingData = JSON.parse(fs.readFileSync('missing-tmdb-ids.json', 'utf8'));
    const allMissingIds = missingData.missingIds;
    
    console.log(`📊 Total missing movies: ${allMissingIds.length}`);
    
    // Get batch to process
    let batchIds = allMissingIds.slice(config.offset, config.offset + config.limit);
    
    // Use test mode with known valid TMDB IDs to check if API works
    if (config.offset === 0 && config.limit <= 10) {
      console.log('🧪 Using test TMDB IDs that definitely exist...');
      batchIds = [550, 13, 11, 15, 278]; // Fight Club, Forrest Gump, Star Wars, 8½, The Shining
      batchIds = batchIds.slice(0, config.limit);
    }
    
    if (batchIds.length === 0) {
      console.log('✅ No movies to process at this offset');
      return;
    }
    
    console.log(`🎯 Processing batch: ${config.offset + 1}-${config.offset + batchIds.length} of ${allMissingIds.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batchIds.length; i++) {
      const tmdbId = batchIds[i];
      const current = config.offset + i + 1;
      
      console.log(`\n[${current}/${allMissingIds.length}] Processing TMDB ID: ${tmdbId}`);
      
      const result = await createMovie(tmdbId, config.baseUrl);
      results.push(result);
      
      if (result.success) {
        successCount++;
        const statusIcon = result.source === 'existing' ? '♻️' : '✅';
        console.log(`${statusIcon} ${tmdbId} | ${result.title} (${result.year}) | "${result.slug}" | ${result.source}`);
      } else {
        errorCount++;
        console.log(`❌ ${tmdbId} | ERROR | ${result.error}`);
      }
      
      // Rate limiting delay (except for last request)
      if (i < batchIds.length - 1) {
        console.log(`⏱️  Waiting ${DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
    
    // Summary
    console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Batch Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Success Rate: ${((successCount / batchIds.length) * 100).toFixed(1)}%`);
    
    if (config.offset + config.limit < allMissingIds.length) {
      const nextOffset = config.offset + config.limit;
      console.log(`\\n🔄 To continue with next batch, run:`);
      console.log(`   node batch-create-movies.js --offset ${nextOffset} --limit ${config.limit}`);
    } else {
      console.log(`\\n🎉 All batches processed!`);
    }
    
    // Save results with timestamp
    const logFile = `batch-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    fs.writeFileSync(logFile, JSON.stringify({
      config,
      results,
      summary: { successCount, errorCount, batchSize: batchIds.length },
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`💾 Results saved to: ${logFile}`);
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }
}

// Usage info
if (process.argv.includes('--help')) {
  console.log('🎬 Batch Create Movies - Usage:');
  console.log('');
  console.log('node batch-create-movies.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --offset N     Start at movie N (default: 0)');
  console.log('  --limit N      Process N movies (default: 5)');
  console.log('  --localhost    Use localhost:3000 instead of moviegenius.ai');
  console.log('  --help         Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node batch-create-movies.js                    # Test batch (5 movies)');
  console.log('  node batch-create-movies.js --limit 10         # Process 10 movies');
  console.log('  node batch-create-movies.js --offset 50        # Start from movie 50');
  console.log('  node batch-create-movies.js --localhost        # Test with local dev');
  process.exit(0);
}

batchCreateMovies();