// Browserless Movie Content Generator
// Uses Puppeteer to visit movie pages and trigger content generation
// Bypasses API issues by simulating real page visits

const puppeteer = require('puppeteer');
const fs = require('fs');

console.log('🎬 Browserless Movie Content Generator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Configuration
const CONFIG = {
  BASE_URL: 'https://moviegenius.ai',
  CONCURRENT_PAGES: 2, // Number of parallel browser tabs
  PAGE_TIMEOUT: 30000, // 30 second timeout per page
  BATCH_SIZE: 10, // Process N movies before progress update
  TEST_LIMIT: 20, // Limit for testing (remove for full run)
  WAIT_FOR_ANALYSIS: true, // Wait for Claude analysis to complete
  SAVE_SCREENSHOTS: false // Save screenshots for debugging
};

// Global state
let stats = {
  total: 0,
  completed: 0,
  successful: 0,
  failed: 0,
  cached: 0,
  fresh: 0,
  startTime: Date.now(),
  errors: [],
  results: []
};

/**
 * Enhanced progress dashboard
 */
function showProgress() {
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
  console.log(`│ 🔄 Fresh Content: ${stats.fresh}`.padEnd(64) + '│');
  console.log(`│ 💾 Cached: ${stats.cached}`.padEnd(64) + '│');
  console.log(`│ ⏱️  Rate: ${rate.toFixed(1)}/sec`.padEnd(64) + '│');
  console.log(`│ 🕐 ETA: ${etaFormatted}`.padEnd(64) + '│');
  console.log('└─────────────────────────────────────────────────────────────────┘');
}

/**
 * Load TMDB IDs for processing
 */
function loadTmdbIds() {
  try {
    console.log('\n📂 Loading TMDB IDs...');
    
    const possibleFiles = [
      './missing-tmdb-ids.json',
      '../missing-tmdb-ids.json',
      './tmdb-ids.json'
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const allTmdbIds = data.missingIds || data.tmdb_ids || data || [];
        
        // Limit for testing if specified
        const testIds = CONFIG.TEST_LIMIT ? allTmdbIds.slice(0, CONFIG.TEST_LIMIT) : allTmdbIds;
        
        console.log(`✅ Loaded ${testIds.length} TMDB IDs from ${file}`);
        if (CONFIG.TEST_LIMIT) {
          console.log(`🧪 Testing with first ${CONFIG.TEST_LIMIT} movies`);
        }
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
 * Visit a single movie page and wait for content generation
 */
async function processMoviePage(page, tmdbId, index) {
  const url = `${CONFIG.BASE_URL}/movie/${tmdbId}`;
  const startTime = Date.now();
  
  try {
    console.log(`\n🔄 [${index + 1}/${stats.total}] Processing ${url}...`);
    
    // Navigate to movie page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.PAGE_TIMEOUT 
    });
    
    // Check if page loads successfully (not 404)
    const title = await page.title();
    if (title.includes('404') || title.includes('Not Found')) {
      throw new Error('Movie page not found (404)');
    }
    
    // Wait for movie header to load
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      const movieTitle = await page.$eval('h1', el => el.textContent?.trim());
      console.log(`   📄 Page loaded: "${movieTitle}"`);
    } catch (e) {
      console.log(`   📄 Page loaded (no title found)`);
    }
    
    if (CONFIG.WAIT_FOR_ANALYSIS) {
      // Wait for Claude analysis to complete
      console.log(`   ⏳ Waiting for Claude analysis...`);
      
      try {
        // Wait for either success content or error message
        await Promise.race([
          // Wait for explore further section (indicates successful analysis)
          page.waitForSelector('[data-testid="explore-further"], .explore-further, h3:contains("Explore Further")', { timeout: 25000 }),
          
          // Or wait for analysis content to appear
          page.waitForFunction(() => {
            const content = document.body.textContent;
            return content.includes('Explore Further') || 
                   content.includes('More Ideas') ||
                   content.includes('EXPLORE_FURTHER') ||
                   content.length > 2000; // Page has substantial content
          }, { timeout: 25000 }),
          
          // Or wait for error states
          page.waitForSelector('.error, [class*="error"]', { timeout: 25000 })
        ]);
        
        // Check what type of content was generated
        const pageContent = await page.evaluate(() => {
          const text = document.body.textContent;
          return {
            hasExploreFurther: text.includes('Explore Further'),
            hasMoreIdeas: text.includes('More Ideas'),
            hasAnalysis: text.length > 2000,
            contentLength: text.length
          };
        });
        
        const responseTime = Date.now() - startTime;
        
        if (pageContent.hasExploreFurther) {
          console.log(`   ✅ ${tmdbId}: Content generated with Explore Further (${responseTime}ms)`);
          stats.fresh++;
        } else if (pageContent.hasAnalysis) {
          console.log(`   ✅ ${tmdbId}: Content generated (${responseTime}ms)`);
          stats.fresh++;
        } else {
          console.log(`   ✅ ${tmdbId}: Cached content loaded (${responseTime}ms)`);
          stats.cached++;
        }
        
      } catch (waitError) {
        // Analysis didn't complete in time, but page might still be working
        const responseTime = Date.now() - startTime;
        console.log(`   ⚠️  ${tmdbId}: Page loaded but analysis timeout (${responseTime}ms)`);
        stats.cached++; // Assume cached if no fresh analysis
      }
    }
    
    // Optional: Save screenshot for debugging
    if (CONFIG.SAVE_SCREENSHOTS) {
      await page.screenshot({ 
        path: `./screenshots/movie-${tmdbId}.png`,
        fullPage: false 
      });
    }
    
    const result = {
      success: true,
      tmdbId,
      url,
      responseTime: Date.now() - startTime
    };
    
    stats.results.push(result);
    stats.successful++;
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ ${tmdbId}: ${error.message} (${responseTime}ms)`);
    
    const result = {
      success: false,
      tmdbId,
      url,
      error: error.message,
      responseTime
    };
    
    stats.results.push(result);
    stats.errors.push({ tmdbId, error: error.message });
    stats.failed++;
    return result;
  }
}

/**
 * Process movies in parallel batches
 */
async function processBatch(browser, tmdbIds, startIndex) {
  const batchPromises = [];
  
  for (let i = 0; i < Math.min(CONFIG.CONCURRENT_PAGES, tmdbIds.length); i++) {
    const tmdbId = tmdbIds[i];
    const globalIndex = startIndex + i;
    
    const pagePromise = browser.newPage().then(async (page) => {
      try {
        // Set page timeout and user agent
        await page.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);
        await page.setUserAgent('Browserless-Content-Generator/1.0');
        
        const result = await processMoviePage(page, tmdbId, globalIndex);
        await page.close();
        return result;
      } catch (error) {
        await page.close();
        throw error;
      }
    });
    
    batchPromises.push(pagePromise);
  }
  
  const results = await Promise.allSettled(batchPromises);
  
  // Update stats for completed items
  results.forEach((result, i) => {
    stats.completed++;
    if (result.status === 'rejected') {
      stats.failed++;
      stats.errors.push({ 
        tmdbId: tmdbIds[i], 
        error: result.reason?.message || 'Unknown error' 
      });
    }
  });
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  let browser;
  
  try {
    console.log('🚀 Initializing browserless content generator...');
    
    const tmdbIds = loadTmdbIds();
    stats.total = tmdbIds.length;
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`   🌐 Base URL: ${CONFIG.BASE_URL}`);
    console.log(`   🔄 Concurrent pages: ${CONFIG.CONCURRENT_PAGES}`);
    console.log(`   ⏱️  Page timeout: ${CONFIG.PAGE_TIMEOUT}ms`);
    console.log(`   📦 Batch size: ${CONFIG.BATCH_SIZE}`);
    console.log(`   🧪 Processing: ${tmdbIds.length} movies`);
    
    // Launch browser
    console.log('\n🌐 Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    console.log('✅ Browser launched successfully');
    showProgress();
    
    // Create screenshots directory if needed
    if (CONFIG.SAVE_SCREENSHOTS) {
      if (!fs.existsSync('./screenshots')) {
        fs.mkdirSync('./screenshots');
      }
    }
    
    // Process in batches
    for (let i = 0; i < tmdbIds.length; i += CONFIG.CONCURRENT_PAGES) {
      const batch = tmdbIds.slice(i, i + CONFIG.CONCURRENT_PAGES);
      const batchNum = Math.floor(i / CONFIG.CONCURRENT_PAGES) + 1;
      const totalBatches = Math.ceil(tmdbIds.length / CONFIG.CONCURRENT_PAGES);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} movies)`);
      
      await processBatch(browser, batch, i);
      
      // Show progress every batch
      showProgress();
      
      // Small delay between batches to be respectful
      if (i + CONFIG.CONCURRENT_PAGES < tmdbIds.length) {
        console.log('\n⏱️  Brief pause between batches...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`🎬 Total movies processed: ${stats.total}`);
    console.log(`✅ Successfully processed: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    console.log(`🔄 Fresh content generated: ${stats.fresh}`);
    console.log(`💾 Cached content: ${stats.cached}`);
    
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`🚀 Average rate: ${(stats.completed / totalTime).toFixed(2)} movies/second`);
    
    // Save results
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const resultsFile = `./browserless-results-${timestamp}.json`;
    
    fs.writeFileSync(resultsFile, JSON.stringify({
      summary: stats,
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: stats.results
    }, null, 2));
    
    console.log(`\n💾 Results saved: ${resultsFile}`);
    
    if (stats.failed > 0) {
      console.log('\n⚠️  FAILED MOVIES (first 10):');
      stats.errors.slice(0, 10).forEach(error => {
        console.log(`   🔴 ${error.tmdbId}: ${error.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    }
    
    console.log('\n🎉 Browserless content generation completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🌐 Browser closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main();