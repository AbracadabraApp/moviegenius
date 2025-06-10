// Bulk Movie Content Generator
// Calls /api/load-movie-page directly for all newly added TMDB IDs
// Triggers: TMDB data + Claude analysis + explore further topics + database storage

const fs = require('fs');
const path = require('path');

console.log('🎬 Bulk Movie Content Generator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Configuration
const CONFIG = {
  BASE_URL: 'https://moviegenius.ai', // Change to localhost:3000 for local testing
  CONCURRENT_REQUESTS: 3, // Number of parallel API calls
  RATE_LIMIT_MS: 2000, // Delay between batches (2 seconds)
  RETRY_ATTEMPTS: 3, // Number of retries for failed requests
  CHECKPOINT_INTERVAL: 10, // Save progress every N completed movies
  BATCH_SIZE: 5 // Process N movies at a time
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
  errors: []
};

/**
 * Load TMDB IDs from the missing IDs file
 */
function loadTmdbIds() {
  try {
    console.log('\n📂 Loading TMDB IDs...');
    
    // Try multiple possible file locations
    const possibleFiles = [
      './missing-tmdb-ids.json',
      '../missing-tmdb-ids.json',
      './tmdb-ids.json'
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        // Handle different file structures
        const tmdbIds = data.missingIds || data.tmdb_ids || data || [];
        
        console.log(`✅ Loaded ${tmdbIds.length} TMDB IDs from ${file}`);
        return tmdbIds;
      }
    }
    
    throw new Error('No TMDB IDs file found. Expected: missing-tmdb-ids.json');
  } catch (error) {
    console.error('❌ Failed to load TMDB IDs:', error.message);
    process.exit(1);
  }
}

/**
 * Load progress checkpoint if it exists
 */
function loadCheckpoint() {
  const checkpointFile = './content-generation-progress.json';
  
  if (fs.existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      console.log(`📊 Resuming from checkpoint: ${checkpoint.completed}/${checkpoint.total} completed`);
      return checkpoint;
    } catch (error) {
      console.warn('⚠️ Could not load checkpoint file, starting fresh');
    }
  }
  
  return null;
}

/**
 * Save progress checkpoint
 */
function saveCheckpoint(tmdbIds, completedIds) {
  const checkpoint = {
    ...stats,
    tmdbIds,
    completedIds,
    lastSaved: new Date().toISOString()
  };
  
  fs.writeFileSync('./content-generation-progress.json', JSON.stringify(checkpoint, null, 2));
}

/**
 * Call the load-movie-page API for a single TMDB ID
 */
async function generateMovieContent(tmdbId) {
  try {
    console.log(`   🔄 Processing TMDB ID ${tmdbId}...`);
    
    const response = await fetch(`${CONFIG.BASE_URL}/api/load-movie-page`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bulk-Content-Generator/1.0'
      },
      body: JSON.stringify({ tmdb_id: parseInt(tmdbId) }),
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      const movieTitle = data.movie?.title || 'Unknown';
      const movieYear = data.movie?.year || '';
      const cached = data.cached ? '(cached)' : '(fresh)';
      const cost = data.cost || 0;
      
      console.log(`   ✅ ${tmdbId}: ${movieTitle} (${movieYear}) ${cached}`);
      
      if (cost > 0) {
        stats.estimatedCost += cost;
        console.log(`   💰 Claude cost: $${cost.toFixed(4)}`);
      }
      
      return { success: true, tmdbId, title: movieTitle, year: movieYear, cost };
    } else {
      throw new Error(data.error || 'Unknown API error');
    }
    
  } catch (error) {
    console.log(`   ❌ ${tmdbId}: ${error.message}`);
    return { success: false, tmdbId, error: error.message };
  }
}

/**
 * Process a batch of TMDB IDs with controlled concurrency
 */
async function processBatch(tmdbIds) {
  const promises = tmdbIds.map(tmdbId => generateMovieContent(tmdbId));
  const results = await Promise.all(promises);
  
  // Update statistics
  results.forEach(result => {
    if (result.success) {
      stats.successful++;
    } else {
      stats.failed++;
      stats.errors.push({ tmdbId: result.tmdbId, error: result.error });
    }
    stats.completed++;
  });
  
  return results;
}

/**
 * Display progress and statistics
 */
function showProgress() {
  const percent = ((stats.completed / stats.total) * 100).toFixed(1);
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.completed / (elapsed / 1000);
  const eta = stats.total > stats.completed ? ((stats.total - stats.completed) / rate) : 0;
  
  const etaFormatted = eta > 3600 ? 
    `${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m` :
    eta > 60 ? `${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s` :
    `${Math.floor(eta)}s`;
  
  console.log(`\n📈 Progress: ${stats.completed}/${stats.total} (${percent}%) | Success: ${stats.successful} | Failed: ${stats.failed} | Rate: ${rate.toFixed(1)}/sec | ETA: ${etaFormatted}`);
  
  if (stats.estimatedCost > 0) {
    console.log(`💰 Claude API cost so far: $${stats.estimatedCost.toFixed(4)}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Load TMDB IDs and checkpoint
    const allTmdbIds = loadTmdbIds();
    const checkpoint = loadCheckpoint();
    
    // Determine which IDs to process
    let tmdbIds = allTmdbIds;
    let completedIds = [];
    
    if (checkpoint) {
      stats = { ...checkpoint };
      completedIds = checkpoint.completedIds || [];
      tmdbIds = allTmdbIds.filter(id => !completedIds.includes(id));
      console.log(`📊 Resuming: ${tmdbIds.length} remaining IDs to process`);
    }
    
    stats.total = allTmdbIds.length;
    
    console.log(`\n🎯 Starting content generation for ${tmdbIds.length} movies...`);
    console.log(`⚙️  Rate limiting: ${CONFIG.RATE_LIMIT_MS}ms between batches`);
    console.log(`🔄 Concurrent requests: ${CONFIG.CONCURRENT_REQUESTS}`);
    console.log(`🎬 Batch size: ${CONFIG.BATCH_SIZE}`);
    
    showProgress();
    
    // Process in batches
    for (let i = 0; i < tmdbIds.length; i += CONFIG.BATCH_SIZE) {
      const batch = tmdbIds.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(tmdbIds.length / CONFIG.BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} movies)`);
      console.log(`   IDs: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? '...' : ''}`);
      
      try {
        const results = await processBatch(batch);
        
        // Track completed IDs for checkpoint
        results.forEach(result => {
          if (result.success) {
            completedIds.push(result.tmdbId);
          }
        });
        
        // Save checkpoint periodically
        if (stats.completed % CONFIG.CHECKPOINT_INTERVAL === 0) {
          saveCheckpoint(allTmdbIds, completedIds);
          console.log(`   💾 Checkpoint saved`);
        }
        
        showProgress();
        
        // Rate limiting between batches
        if (i + CONFIG.BATCH_SIZE < tmdbIds.length) {
          console.log(`   ⏱️  Waiting ${CONFIG.RATE_LIMIT_MS / 1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
        }
        
      } catch (error) {
        console.error(`   💥 Batch ${batchNum} failed:`, error.message);
        stats.failed += batch.length;
        stats.completed += batch.length;
      }
    }
    
    // Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL SUMMARY:');
    console.log(`   🎬 Total movies: ${stats.total}`);
    console.log(`   ✅ Successfully processed: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   📈 Success rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
    
    if (stats.estimatedCost > 0) {
      console.log(`   💰 Total Claude API cost: $${stats.estimatedCost.toFixed(4)}`);
    }
    
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(`   ⏱️  Total time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`   🚀 Average rate: ${(stats.completed / totalTime).toFixed(2)} movies/second`);
    
    // Save final results
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const resultsFile = `./content-generation-results-${timestamp}.json`;
    
    fs.writeFileSync(resultsFile, JSON.stringify({
      summary: stats,
      timestamp: new Date().toISOString(),
      config: CONFIG
    }, null, 2));
    
    console.log(`\n💾 Results saved: ${resultsFile}`);
    
    // Clean up checkpoint file on successful completion
    if (fs.existsSync('./content-generation-progress.json')) {
      fs.unlinkSync('./content-generation-progress.json');
      console.log('🗑️  Checkpoint file cleaned up');
    }
    
    if (stats.failed > 0) {
      console.log('\n⚠️  FAILED MOVIES:');
      stats.errors.slice(0, 10).forEach(error => {
        console.log(`   ${error.tmdbId}: ${error.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    }
    
    console.log('\n🎉 Content generation completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log('🎬 Bulk Movie Content Generator - Usage:');
  console.log('');
  console.log('node bulk-content-generator.js');
  console.log('');
  console.log('This script will:');
  console.log('  1. Load TMDB IDs from missing-tmdb-ids.json');
  console.log('  2. Call /api/load-movie-page for each ID');
  console.log('  3. Generate complete movie content (TMDB + Claude + explore further)');
  console.log('  4. Save progress and handle failures gracefully');
  console.log('');
  console.log('Features:');
  console.log('  - Rate limiting to respect Claude API limits');
  console.log('  - Progress tracking with ETA');
  console.log('  - Resume capability from checkpoints');
  console.log('  - Cost estimation for Claude API usage');
  process.exit(0);
}

// Run the main function
main();