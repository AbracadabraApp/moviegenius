// Robust Batch Movie Creator - Extensively tested for production use
const fs = require('fs');

console.log('🎬 Robust Batch Movie Creator - Production Ready');

// Enhanced Configuration
const DEFAULT_CONFIG = {
  batchSize: 3,           // Very conservative for testing
  delayMs: 8000,          // 8 seconds between requests (avoid Claude timeouts)
  retryAttempts: 2,       // Retry failed requests
  retryDelayMs: 15000,    // 15 seconds between retries
  offset: 0,
  baseUrl: 'https://moviegenius.ai',
  testMode: false,        // Use real missing IDs vs test IDs
  validateTmdb: false     // Pre-validate TMDB IDs before creating
};

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

// Parse command line arguments with enhanced options
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--offset':
        config.offset = parseInt(args[++i]) || 0;
        break;
      case '--limit':
        config.batchSize = parseInt(args[++i]) || 3;
        break;
      case '--delay':
        config.delayMs = parseInt(args[++i]) || 8000;
        break;
      case '--retry-delay':
        config.retryDelayMs = parseInt(args[++i]) || 15000;
        break;
      case '--retries':
        config.retryAttempts = parseInt(args[++i]) || 2;
        break;
      case '--localhost':
        config.baseUrl = 'http://localhost:3000';
        break;
      case '--test-mode':
        config.testMode = true;
        break;
      case '--validate-tmdb':
        config.validateTmdb = true;
        break;
      case '--production':
        // Production settings: slower, more careful
        config.batchSize = 1;
        config.delayMs = 10000;
        config.retryDelayMs = 20000;
        config.retryAttempts = 3;
        break;
    }
  }
  
  return config;
}

// Validate TMDB ID exists before attempting creation
async function validateTmdbId(tmdbId) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=82e53d2dd47988e591a149b9820a0d9c`);
    return response.ok;
  } catch (error) {
    console.log(`   ⚠️  TMDB validation failed: ${error.message}`);
    return false;
  }
}

// Enhanced movie creation with detailed logging and retry logic
async function createMovie(tmdbId, baseUrl, config) {
  const startTime = Date.now();
  
  console.log(`\n   📍 Starting: TMDB ID ${tmdbId}`);
  console.log(`   🔗 URL: ${baseUrl}/api/create-media-card`);
  
  // Pre-validate TMDB ID if requested
  if (config.validateTmdb) {
    console.log(`   🔍 Validating TMDB ID...`);
    const isValid = await validateTmdbId(tmdbId);
    if (!isValid) {
      return {
        success: false,
        tmdbId: tmdbId,
        error: 'TMDB ID does not exist',
        validationFailed: true,
        duration: Date.now() - startTime
      };
    }
    console.log(`   ✅ TMDB ID valid`);
  }
  
  // Attempt creation with retries
  for (let attempt = 1; attempt <= config.retryAttempts + 1; attempt++) {
    try {
      console.log(`   🚀 Attempt ${attempt}/${config.retryAttempts + 1}: Calling API...`);
      
      const response = await fetch(`${baseUrl}/api/create-media-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MovieGenius-BatchScript/2.0-Robust'
        },
        body: JSON.stringify({ tmdb_id: tmdbId })
      });
      
      console.log(`   📊 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.movie) {
          const duration = Date.now() - startTime;
          console.log(`   ✅ Success in ${duration}ms`);
          
          return {
            success: true,
            tmdbId: tmdbId,
            title: data.movie.title,
            year: data.movie.year,
            slug: data.movie.slug,
            source: data.source,
            duration: duration,
            attempts: attempt
          };
        } else {
          throw new Error('Invalid response format: ' + JSON.stringify(data));
        }
      } else {
        // Log response body for debugging
        const errorText = await response.text();
        console.log(`   ❌ HTTP ${response.status}: ${errorText.substring(0, 100)}...`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`);
      
      // If this was the last attempt, return failure
      if (attempt > config.retryAttempts) {
        return {
          success: false,
          tmdbId: tmdbId,
          error: error.message,
          duration: Date.now() - startTime,
          attempts: attempt
        };
      }
      
      // Wait before retry
      console.log(`   ⏱️  Waiting ${config.retryDelayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
    }
  }
}

async function runBatchTest() {
  const config = parseArgs();
  
  console.log('\n📋 Configuration:');
  console.log(`   🌐 Base URL: ${config.baseUrl}`);
  console.log(`   📊 Batch Size: ${config.batchSize}`);
  console.log(`   ⏱️  Delay: ${config.delayMs}ms between requests`);
  console.log(`   🔄 Retries: ${config.retryAttempts} attempts with ${config.retryDelayMs}ms delay`);
  console.log(`   🧪 Test Mode: ${config.testMode ? 'ON (using known IDs)' : 'OFF (using missing IDs)'}`);
  console.log(`   🔍 TMDB Validation: ${config.validateTmdb ? 'ON' : 'OFF'}`);
  console.log('');
  
  try {
    let batchIds = [];
    
    if (config.testMode) {
      // Test with a mix of scenarios
      console.log('🧪 TEST MODE: Using carefully selected test cases...');
      batchIds = [
        550,    // Fight Club - should exist (existing)
        278,    // The Shining - should exist (existing) 
        13,     // Forrest Gump - should exist (existing)
        581734, // Nomadland - might be missing but valid TMDB
        313369, // La La Land - might be missing but valid TMDB
        999999, // Invalid TMDB ID - should fail gracefully
      ].slice(0, config.batchSize);
      
      console.log('   📝 Test cases:');
      console.log('   - 550 (Fight Club): Should return "existing"');
      console.log('   - 278 (The Shining): Should return "existing"');
      console.log('   - 13 (Forrest Gump): Should return "existing"');
      console.log('   - 581734 (Nomadland): Should create or return existing');
      console.log('   - 313369 (La La Land): Should create or return existing');
      console.log('   - 999999 (Invalid): Should fail gracefully');
      
    } else {
      // Use real missing IDs
      console.log('🎯 PRODUCTION MODE: Using missing TMDB IDs from list...');
      const missingData = JSON.parse(fs.readFileSync('missing-tmdb-ids.json', 'utf8'));
      const allMissingIds = missingData.missingIds;
      
      console.log(`📊 Total missing movies: ${allMissingIds.length}`);
      batchIds = allMissingIds.slice(config.offset, config.offset + config.batchSize);
    }
    
    if (batchIds.length === 0) {
      console.log('✅ No movies to process at this offset');
      return;
    }
    
    console.log(`🎯 Processing ${batchIds.length} movies starting at offset ${config.offset}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let existingCount = 0;
    let createdCount = 0;
    
    for (let i = 0; i < batchIds.length; i++) {
      const tmdbId = batchIds[i];
      const current = config.offset + i + 1;
      
      console.log(`\n[${current}] Processing TMDB ID: ${tmdbId}`);
      console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
      
      const result = await createMovie(tmdbId, config.baseUrl, config);
      results.push(result);
      
      if (result.success) {
        successCount++;
        if (result.source === 'existing') {
          existingCount++;
          console.log(`♻️  EXISTING | ${result.tmdbId} | ${result.title} (${result.year}) | "${result.slug}" | ${result.duration}ms`);
        } else {
          createdCount++;
          console.log(`✅ CREATED | ${result.tmdbId} | ${result.title} (${result.year}) | "${result.slug}" | ${result.duration}ms`);
        }
      } else {
        errorCount++;
        if (result.validationFailed) {
          console.log(`🚫 INVALID TMDB | ${result.tmdbId} | ${result.error} | ${result.duration}ms`);
        } else {
          console.log(`❌ FAILED | ${result.tmdbId} | ${result.error} | ${result.duration}ms`);
        }
      }
      
      // Rate limiting delay (except for last request)
      if (i < batchIds.length - 1) {
        console.log(`⏱️  Rate limiting: waiting ${config.delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.delayMs));
      }
    }
    
    // Enhanced Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 BATCH SUMMARY:');
    console.log(`   ✅ Total Success: ${successCount}/${batchIds.length} (${((successCount / batchIds.length) * 100).toFixed(1)}%)`);
    console.log(`   ♻️  Existing Movies: ${existingCount}`);
    console.log(`   🆕 Created Movies: ${createdCount}`);
    console.log(`   ❌ Failures: ${errorCount}`);
    
    // Performance stats
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
      const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      console.log(`   ⚡ Avg Response Time: ${avgDuration.toFixed(0)}ms`);
    }
    
    // Next steps guidance
    if (config.offset + config.batchSize < (config.testMode ? 6 : 1957)) {
      const nextOffset = config.offset + config.batchSize;
      console.log(`\n🔄 To continue with next batch:`);
      console.log(`   node batch-create-movies-robust.js --offset ${nextOffset} --limit ${config.batchSize}`);
      if (config.testMode) console.log(`   (remove --test-mode for production missing IDs)`);
    } else {
      console.log(`\n🎉 ${config.testMode ? 'TEST' : 'BATCH'} COMPLETE!`);
    }
    
    // Save detailed results
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const logFile = `batch-results-robust-${timestamp}.json`;
    
    const logData = {
      config,
      results,
      summary: { 
        total: batchIds.length,
        successCount, 
        existingCount,
        createdCount, 
        errorCount,
        successRate: ((successCount / batchIds.length) * 100).toFixed(1) + '%'
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`💾 Detailed results saved: ${logFile}`);
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    console.error(error.stack);
  }
}

// Enhanced usage info
if (process.argv.includes('--help')) {
  console.log('🎬 Robust Batch Movie Creator - Usage Guide');
  console.log('');
  console.log('TESTING:');
  console.log('  node batch-create-movies-robust.js --test-mode --limit 6');
  console.log('  node batch-create-movies-robust.js --test-mode --validate-tmdb --limit 3');
  console.log('');
  console.log('PRODUCTION:');
  console.log('  node batch-create-movies-robust.js --production --limit 10');
  console.log('  node batch-create-movies-robust.js --offset 100 --limit 5 --delay 12000');
  console.log('');
  console.log('OPTIONS:');
  console.log('  --offset N         Start at movie N (default: 0)');
  console.log('  --limit N          Process N movies (default: 3)');
  console.log('  --delay N          Milliseconds between requests (default: 8000)');
  console.log('  --retries N        Retry attempts for failures (default: 2)');
  console.log('  --retry-delay N    Milliseconds between retries (default: 15000)');
  console.log('  --test-mode        Use known test IDs instead of missing list');
  console.log('  --validate-tmdb    Pre-validate TMDB IDs exist before creating');
  console.log('  --production       Use conservative production settings');
  console.log('  --localhost        Use localhost:3000 instead of production');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  # Test with known IDs and validation');
  console.log('  node batch-create-movies-robust.js --test-mode --validate-tmdb');
  console.log('');
  console.log('  # Production run with retries');
  console.log('  node batch-create-movies-robust.js --production --offset 0 --limit 50');
  process.exit(0);
}

runBatchTest();