// Monitored Browserless Movie Content Generator
// Enhanced version with real-time logging and progress tracking

const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuration - Optimized for reliability
const CONFIG = {
  BASE_URL: 'https://moviegenius.ai',
  CONCURRENT_PAGES: 1, // Reduced for stability
  PAGE_TIMEOUT: 60000, // Increased to 60 seconds
  BATCH_SIZE: 10,
  TEST_LIMIT: null, // Set to null for full run
  WAIT_FOR_ANALYSIS: true,
  SAVE_SCREENSHOTS: false,
  LOG_FILE: './content-generation.log',
  PROGRESS_FILE: './content-generation-progress.json',
  RETRY_ATTEMPTS: 2, // Retry failed movies
  RETRY_DELAY: 2000, // 2 second delay between retries
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
  results: [],
  currentActivity: null,
};

/**
 * Enhanced logging with timestamps and file output
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;

  // Console output
  console.log(message);

  // File output
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logEntry + '\n');
  } catch (error) {
    // Continue if logging fails
  }
}

/**
 * Update progress file for real-time monitoring
 */
function updateProgress() {
  const progressData = {
    ...stats,
    timestamp: new Date().toISOString(),
    config: CONFIG,
  };

  try {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progressData, null, 2));
  } catch (error) {
    // Continue if progress update fails
  }
}

/**
 * Enhanced progress dashboard with file logging
 */
function showProgress() {
  const percent = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.completed / (elapsed / 1000);
  const eta = stats.total > stats.completed ? (stats.total - stats.completed) / rate : 0;

  const etaFormatted =
    eta > 3600
      ? `${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m`
      : eta > 60
        ? `${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s`
        : `${Math.floor(eta)}s`;

  const progressMessage = `Progress: ${stats.completed}/${stats.total} (${percent}%) | ✅${stats.successful} ❌${stats.failed} 🔄${stats.fresh} 💾${stats.cached} | Rate: ${rate.toFixed(1)}/sec | ETA: ${etaFormatted}`;

  log(`📊 ${progressMessage}`);
  updateProgress();
}

/**
 * Load TMDB IDs for processing
 */
function loadTmdbIds() {
  try {
    log('📂 Loading TMDB IDs...');

    const possibleFiles = [
      '/Users/josh.petersen/moviegenius/all-tmdb-ids.json',
      './all-tmdb-ids.json',
      './missing-tmdb-ids.json',
      '../missing-tmdb-ids.json',
      './tmdb-ids.json',
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        let allTmdbIds;

        if (Array.isArray(data)) {
          allTmdbIds = data;
        } else if (data.missingIds && Array.isArray(data.missingIds)) {
          allTmdbIds = data.missingIds;
        } else if (data.tmdb_ids && Array.isArray(data.tmdb_ids)) {
          allTmdbIds = data.tmdb_ids;
        } else if (data.tmdbIds && Array.isArray(data.tmdbIds)) {
          allTmdbIds = data.tmdbIds;
        } else {
          allTmdbIds = [];
        }

        // Limit for testing if specified
        const testIds = CONFIG.TEST_LIMIT ? allTmdbIds.slice(0, CONFIG.TEST_LIMIT) : allTmdbIds;

        log(`✅ Loaded ${testIds.length} TMDB IDs from ${file}`);
        if (CONFIG.TEST_LIMIT) {
          log(`🧪 Testing with first ${CONFIG.TEST_LIMIT} movies`);
        } else {
          log(`🚀 Processing all ${testIds.length} movies from database`);
        }
        return testIds;
      }
    }

    throw new Error('No TMDB IDs file found');
  } catch (error) {
    log(`❌ Failed to load TMDB IDs: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Enhanced movie page processing with detailed logging and retry logic
 */
async function processMoviePageWithRetry(page, tmdbId, index, attempt = 1) {
  try {
    return await processMoviePage(page, tmdbId, index);
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      log(
        `   🔄 Retry ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS} for ${tmdbId} after ${CONFIG.RETRY_DELAY}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return await processMoviePageWithRetry(page, tmdbId, index, attempt + 1);
    } else {
      throw error;
    }
  }
}

/**
 * Enhanced movie page processing with detailed logging
 */
async function processMoviePage(page, tmdbId, index) {
  const url = `${CONFIG.BASE_URL}/movie/${tmdbId}`;
  const startTime = Date.now();

  try {
    stats.currentActivity = `Processing ${tmdbId} (${index + 1}/${stats.total})`;
    updateProgress();

    log(`🔄 [${index + 1}/${stats.total}] Processing ${url}...`);

    // Navigate to movie page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    // Check if page loads successfully
    const title = await page.title();
    if (title.includes('404') || title.includes('Not Found')) {
      throw new Error('Movie page not found (404)');
    }

    // Get movie title if available
    let movieTitle = 'Unknown';
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      movieTitle = (await page.$eval('h1', el => el.textContent?.trim())) || 'Unknown';
      log(`   📄 Page loaded: "${movieTitle}"`);
    } catch (e) {
      log(`   📄 Page loaded (title not found)`);
    }

    if (CONFIG.WAIT_FOR_ANALYSIS) {
      log(`   ⏳ Waiting for Claude analysis...`);

      try {
        // Wait for content generation indicators - increased timeout
        await Promise.race([
          page.waitForFunction(
            () => {
              const content = document.body.textContent;
              return (
                content.includes('Explore Further') ||
                content.includes('More Ideas') ||
                content.includes('EXPLORE_FURTHER') ||
                content.length > 2000
              );
            },
            { timeout: 50000 }
          ), // Increased to 50 seconds

          page.waitForSelector('.error, [class*="error"]', { timeout: 50000 }),
        ]);

        // Analyze generated content
        const pageContent = await page.evaluate(() => {
          const text = document.body.textContent;
          const exploreFurtherCount = (text.match(/Explore Further/gi) || []).length;
          return {
            hasExploreFurther: text.includes('Explore Further'),
            exploreFurtherCount,
            hasMoreIdeas: text.includes('More Ideas'),
            hasAnalysis: text.length > 2000,
            contentLength: text.length,
          };
        });

        const responseTime = Date.now() - startTime;

        if (pageContent.hasExploreFurther) {
          log(
            `   ✅ ${tmdbId}: "${movieTitle}" - Fresh content with ${pageContent.exploreFurtherCount} explore topics (${responseTime}ms)`
          );
          stats.fresh++;
        } else if (pageContent.hasAnalysis) {
          log(`   ✅ ${tmdbId}: "${movieTitle}" - Content generated (${responseTime}ms)`);
          stats.fresh++;
        } else {
          log(`   ✅ ${tmdbId}: "${movieTitle}" - Cached content (${responseTime}ms)`);
          stats.cached++;
        }
      } catch (waitError) {
        const responseTime = Date.now() - startTime;
        log(
          `   ⚠️  ${tmdbId}: "${movieTitle}" - Analysis timeout but page loaded (${responseTime}ms)`
        );
        stats.cached++;
      }
    }

    const result = {
      success: true,
      tmdbId,
      title: movieTitle,
      url,
      responseTime: Date.now() - startTime,
    };

    stats.results.push(result);
    stats.successful++;
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log(`   ❌ ${tmdbId}: ${error.message} (${responseTime}ms)`);

    const result = {
      success: false,
      tmdbId,
      url,
      error: error.message,
      responseTime,
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

    const pagePromise = browser.newPage().then(async page => {
      try {
        await page.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);
        await page.setUserAgent('Monitored-Content-Generator/1.0');

        const result = await processMoviePageWithRetry(page, tmdbId, globalIndex);
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

  // Update stats
  results.forEach((result, i) => {
    stats.completed++;
    if (result.status === 'rejected') {
      stats.failed++;
      stats.errors.push({
        tmdbId: tmdbIds[i],
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  return results;
}

/**
 * Main execution with enhanced monitoring
 */
async function main() {
  let browser;

  try {
    // Initialize logging
    if (fs.existsSync(CONFIG.LOG_FILE)) {
      fs.unlinkSync(CONFIG.LOG_FILE);
    }
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      fs.unlinkSync(CONFIG.PROGRESS_FILE);
    }

    log('🎬 Monitored Browserless Movie Content Generator');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('🚀 Initializing monitored content generator...');

    const tmdbIds = loadTmdbIds();
    stats.total = tmdbIds.length;

    log(`⚙️  Configuration:`);
    log(`   🌐 Base URL: ${CONFIG.BASE_URL}`);
    log(`   🔄 Concurrent pages: ${CONFIG.CONCURRENT_PAGES}`);
    log(`   ⏱️  Page timeout: ${CONFIG.PAGE_TIMEOUT}ms`);
    log(`   📦 Batch size: ${CONFIG.BATCH_SIZE}`);
    log(`   🧪 Processing: ${tmdbIds.length} movies`);
    log(`   📁 Log file: ${CONFIG.LOG_FILE}`);
    log(`   📊 Progress file: ${CONFIG.PROGRESS_FILE}`);

    // Launch browser
    log('🌐 Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    log('✅ Browser launched successfully');
    log('📊 Monitor this script with: node real-time-monitor.js');
    showProgress();

    // Process in batches with increased pauses for stability
    for (let i = 0; i < tmdbIds.length; i += CONFIG.CONCURRENT_PAGES) {
      const batch = tmdbIds.slice(i, i + CONFIG.CONCURRENT_PAGES);
      const batchNum = Math.floor(i / CONFIG.CONCURRENT_PAGES) + 1;
      const totalBatches = Math.ceil(tmdbIds.length / CONFIG.CONCURRENT_PAGES);

      log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} movies)`);

      await processBatch(browser, batch, i);
      showProgress();

      // Longer pause between batches for server stability
      if (i + CONFIG.CONCURRENT_PAGES < tmdbIds.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second pause
      }
    }

    // Final summary
    stats.currentActivity = 'Completed';
    updateProgress();

    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('📊 FINAL SUMMARY');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    log(`🎬 Total movies processed: ${stats.total}`);
    log(
      `✅ Successfully processed: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`
    );
    log(`❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    log(`🔄 Fresh content generated: ${stats.fresh}`);
    log(`💾 Cached content: ${stats.cached}`);

    const totalTime = (Date.now() - stats.startTime) / 1000;
    log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    log(`🚀 Average rate: ${(stats.completed / totalTime).toFixed(2)} movies/second`);

    // Save final results
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const resultsFile = `./monitored-results-${timestamp}.json`;

    fs.writeFileSync(
      resultsFile,
      JSON.stringify(
        {
          summary: stats,
          timestamp: new Date().toISOString(),
          config: CONFIG,
          results: stats.results,
        },
        null,
        2
      )
    );

    log(`💾 Results saved: ${resultsFile}`);

    if (stats.failed > 0) {
      log('⚠️  FAILED MOVIES (first 10):');
      stats.errors.slice(0, 10).forEach(error => {
        log(`   🔴 ${error.tmdbId}: ${error.error}`);
      });
      if (stats.errors.length > 10) {
        log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    }

    log('🎉 Monitored content generation completed!');
  } catch (error) {
    log(`❌ Script failed: ${error.message}`, 'error');
    log(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      log('🌐 Browser closed');
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log('⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main();
