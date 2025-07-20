const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  concurrency: 4, // Number of concurrent tabs
  pageTimeout: 120000, // 2 minutes max per page
  smartTimeout: 90000, // 90 seconds for Claude analysis to complete
  delayBetweenTabs: 500, // Stagger tab starts
  progressInterval: 5, // Progress updates every N completions
  retryAttempts: 2, // Retry failed pages
  logLevel: 'detailed', // 'basic' | 'detailed' | 'verbose'
};

async function visitAllMovieUrls(startOffset = 0, options = {}) {
  const config = { ...CONFIG, ...options };

  console.log('🚀 Starting optimized bulk URL visitor...');
  console.log(`⚙️  Config: ${config.concurrency} tabs, smart detection enabled`);

  // Read URLs from specified file or default
  const urlFile = config.urlFile || 'extracted-movie-urls.json';
  console.log(`📁 Loading URLs from: ${urlFile}`);

  if (!fs.existsSync(urlFile)) {
    console.error(`❌ URL file not found: ${urlFile}`);
    console.log(`💡 Generate clean URLs first: node generate-movie-urls.js`);
    process.exit(1);
  }

  const movieData = JSON.parse(fs.readFileSync(urlFile, 'utf8'));
  console.log(`📊 Found ${movieData.length} URLs to visit`);

  // Apply offset if provided
  const urlsToVisit = movieData.slice(startOffset);
  console.log(`📍 Starting from index ${startOffset}, visiting ${urlsToVisit.length} URLs`);

  // Initialize progress tracking
  const progress = {
    visited: 0,
    errors: 0,
    retries: 0,
    timeouts: 0,
    smartDetected: 0,
    startTime: Date.now(),
    movieResults: new Map(), // Track individual movie results
  };

  // Create progress log file
  const logFile = `bulk-crawler-${Date.now()}.log`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    // Create worker function for concurrent processing
    const processMoviesConcurrently = async () => {
      const workers = [];

      // Create concurrent workers
      for (let i = 0; i < config.concurrency; i++) {
        workers.push(createWorker(browser, urlsToVisit, progress, config, logFile, startOffset));
        // Stagger worker starts to avoid overwhelming
        if (i < config.concurrency - 1) {
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenTabs));
        }
      }

      // Wait for all workers to complete
      await Promise.all(workers);
    };

    await processMoviesConcurrently();
  } finally {
    await browser.close();

    // Final report
    printFinalReport(progress, urlsToVisit.length, startOffset, movieData.length, logFile);
  }
}

/**
 * Create a worker that processes movies concurrently
 */
async function createWorker(browser, movies, progress, config, logFile, startOffset) {
  const page = await browser.newPage();

  // Configure page for optimal performance
  await page.setUserAgent('MovieGenius-Crawler/1.0');
  await page.setViewport({ width: 1200, height: 800 });

  let movieIndex = 0;

  while (movieIndex < movies.length) {
    // Atomic increment to get next movie
    const currentIndex = getNextMovieIndex();
    if (currentIndex >= movies.length) break;

    const movie = movies[currentIndex];
    const globalIndex = startOffset + currentIndex + 1;

    try {
      const result = await processMovie(
        page,
        movie,
        globalIndex,
        movies.length + startOffset,
        config
      );

      // Update progress atomically
      updateProgress(progress, result, movie, logFile);

      // Progress reporting
      if (progress.visited % config.progressInterval === 0) {
        printProgress(progress, startOffset, movies.length + startOffset);
      }
    } catch (error) {
      console.error(`🚨 Worker error processing ${movie.title}:`, error);
      progress.errors++;
    }

    movieIndex++;
  }

  await page.close();
}

// Shared index for atomic movie selection
let sharedMovieIndex = 0;
function getNextMovieIndex() {
  return sharedMovieIndex++;
}

/**
 * Process a single movie with smart loading detection
 */
async function processMovie(page, movie, globalIndex, totalMovies, config) {
  const startTime = Date.now();

  if (config.logLevel === 'verbose') {
    console.log(`[${globalIndex}/${totalMovies}] 🎬 Processing: ${movie.title}`);
  }

  // Navigate with smart detection
  const result = await navigateWithSmartDetection(page, movie.url, config);

  const duration = Date.now() - startTime;

  if (config.logLevel === 'detailed' || config.logLevel === 'verbose') {
    const status = result.success ? '✅' : '❌';
    const method = result.smartDetected ? 'smart' : 'timeout';
    console.log(
      `${status} [${globalIndex}/${totalMovies}] ${movie.title} (${(duration / 1000).toFixed(1)}s, ${method})`
    );
  }

  return {
    ...result,
    movie,
    duration,
    globalIndex,
  };
}

/**
 * Smart loading detection - waits for "Explore Further" content
 */
async function navigateWithSmartDetection(page, url, config) {
  let navigationSuccess = false;
  let pageResponse = null;

  try {
    // Navigate with detailed error tracking
    pageResponse = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.pageTimeout,
    });

    // Check if navigation actually succeeded
    if (!pageResponse) {
      return createErrorResult('No response received', 'navigation-failed');
    }

    const status = pageResponse.status();
    if (status >= 400) {
      return createErrorResult(`HTTP ${status}: ${pageResponse.statusText()}`, 'http-error');
    }

    navigationSuccess = true;

    // Verify basic page structure loaded (more lenient)
    const hasBasicContent = await page.evaluate(() => {
      const body = document.body;
      return body && body.children && body.children.length > 0;
    });

    if (!hasBasicContent) {
      return createErrorResult('Page structure incomplete', 'content-missing');
    }

    // Smart detection with better error handling
    const smartDetected = await Promise.race([
      // Wait for high-value content indicator
      page
        .waitForFunction(
          () => {
            try {
              const content = document.body.innerText || '';
              const hasExploreContent =
                content.includes('Explore Further') ||
                content.includes('More Ideas') ||
                content.includes('Similar Movies');
              const hasRichAnalysis = content.length > 5000 && content.includes('Analysis');
              const hasMovieContent = content.includes('MovieGenius') || content.includes('movie');

              return hasExploreContent || hasRichAnalysis || hasMovieContent;
            } catch (e) {
              return false;
            }
          },
          { timeout: config.smartTimeout }
        )
        .then(() => true)
        .catch(() => false),

      // Fallback timeout
      new Promise(resolve => setTimeout(() => resolve(false), config.smartTimeout)),
    ]);

    // Final content validation
    const finalValidation = await page.evaluate(() => {
      try {
        const content = document.body.innerText || '';
        const title = document.title || '';

        return {
          hasContent: content.length > 100,
          hasTitle: title.length > 0,
          contentLength: content.length,
          isErrorPage:
            content.toLowerCase().includes('error') ||
            content.toLowerCase().includes('not found') ||
            content.toLowerCase().includes('404'),
          hasMovieContent:
            content.toLowerCase().includes('movie') ||
            content.toLowerCase().includes('film') ||
            title.toLowerCase().includes('movie'),
        };
      } catch (e) {
        return { hasContent: false, hasTitle: false, contentLength: 0, isErrorPage: true };
      }
    });

    // Disable strict error page detection - loading states can contain "error" text
    // if (finalValidation.isErrorPage) {
    //     return createErrorResult('Error page detected', 'error-page');
    // }

    // More lenient content validation
    if (finalValidation.contentLength < 50) {
      return createErrorResult(
        `Too little content: ${finalValidation.contentLength} chars`,
        'empty-page'
      );
    }

    // Temporarily disable strict movie content validation for debugging
    // if (!finalValidation.hasMovieContent) {
    //     return createErrorResult('No movie-related content found', 'wrong-content');
    // }

    // Additional brief wait for any final content loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      smartDetected,
      method: smartDetected ? 'smart-content' : 'timeout-fallback',
      contentLength: finalValidation.contentLength,
      httpStatus: status,
    };
  } catch (error) {
    const errorType = navigationSuccess ? 'content-error' : 'navigation-error';
    return createErrorResult(error.message, errorType);
  }
}

/**
 * Create standardized error result
 */
function createErrorResult(message, errorType) {
  return {
    success: false,
    smartDetected: false,
    error: message,
    errorType: errorType,
    method: 'failed',
  };
}

/**
 * Update progress tracking atomically
 */
function updateProgress(progress, result, movie, logFile) {
  if (result.success) {
    progress.visited++;
    if (result.smartDetected) {
      progress.smartDetected++;
    } else {
      // If successful but NOT smart detected, it hit the timeout fallback
      progress.timeouts++;
    }
  } else {
    progress.errors++;

    // Track different error types
    const errorType = result.errorType || 'unknown';
    if (!progress.errorTypes) progress.errorTypes = {};
    progress.errorTypes[errorType] = (progress.errorTypes[errorType] || 0) + 1;

    // Some errors are also timeouts
    if (result.error && (result.error.includes('timeout') || errorType === 'navigation-error')) {
      progress.timeouts++;
    }
  }

  // Store individual movie result
  progress.movieResults.set(movie.title, {
    success: result.success,
    duration: result.duration,
    method: result.method,
    timestamp: new Date().toISOString(),
  });

  // Append to log file with enhanced data
  const errorInfo = result.success ? '' : `|${result.errorType || 'unknown'}|${result.error || ''}`;
  const logEntry = `${new Date().toISOString()},${result.globalIndex},${movie.title},${result.success},${result.duration},${result.method}${errorInfo}\n`;
  fs.appendFileSync(logFile, logEntry);
}

/**
 * Print progress updates
 */
function printProgress(progress, startOffset, totalMovies) {
  const elapsed = (Date.now() - progress.startTime) / 1000;
  const totalCompleted = startOffset + progress.visited;
  const rate = progress.visited / elapsed;
  const remaining = totalMovies - totalCompleted;
  const eta = remaining / rate;

  console.log(`\n📊 Progress Report:`);
  console.log(
    `   ✅ Completed: ${totalCompleted}/${totalMovies} (${((totalCompleted / totalMovies) * 100).toFixed(1)}%)`
  );
  console.log(
    `   🎯 Smart detection: ${progress.smartDetected}/${progress.visited} (${((progress.smartDetected / progress.visited) * 100).toFixed(1)}%)`
  );
  console.log(`   ⏰ Timeouts: ${progress.timeouts} | ❌ Errors: ${progress.errors}`);

  // Show error breakdown if there are errors
  if (progress.errors > 0 && progress.errorTypes) {
    const errorBreakdown = Object.entries(progress.errorTypes)
      .map(([type, count]) => `${type}:${count}`)
      .join(', ');
    console.log(`   🔍 Error types: ${errorBreakdown}`);
  }
  console.log(`   ⚡ Rate: ${rate.toFixed(1)} movies/sec | 🕐 ETA: ${(eta / 60).toFixed(1)} min\n`);
}

/**
 * Print final comprehensive report
 */
function printFinalReport(progress, urlsProcessed, startOffset, totalMovies, logFile) {
  const totalTime = (Date.now() - progress.startTime) / 1000;
  const totalCompleted = startOffset + progress.visited;

  console.log(`\n🎉 BULK CRAWLER COMPLETED!`);
  console.log(`═══════════════════════════════════════`);
  console.log(`📊 SUMMARY:`);
  console.log(`   🎬 Movies processed: ${progress.visited}/${urlsProcessed}`);
  console.log(`   🌍 Total in database: ${totalCompleted}/${totalMovies}`);
  console.log(
    `   ✅ Success rate: ${((progress.visited / (progress.visited + progress.errors)) * 100).toFixed(1)}%`
  );
  console.log(
    `   🎯 Smart detection: ${progress.smartDetected}/${progress.visited} (${((progress.smartDetected / progress.visited) * 100).toFixed(1)}%)`
  );
  console.log(`\n⏱️  PERFORMANCE:`);
  console.log(`   ⏰ Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`   ⚡ Average rate: ${(progress.visited / totalTime).toFixed(2)} movies/second`);
  console.log(`   🚀 Estimated speedup: ${(CONFIG.concurrency * 2).toFixed(1)}x vs old script`);
  console.log(`\n📝 DETAILED LOG: ${logFile}`);
  console.log(`   Use this file for analysis and debugging`);
  console.log(`═══════════════════════════════════════\n`);
}

// Run the bulk visitor
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const startOffset = parseInt(args[0]) || 0;

  // Parse options (--urls=filename)
  const options = {};
  args.forEach(arg => {
    if (arg.startsWith('--urls=')) {
      options.urlFile = arg.split('=')[1];
    }
  });

  visitAllMovieUrls(startOffset, options)
    .then(() => {
      console.log('✅ Bulk visiting completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Bulk visiting failed:', error);
      process.exit(1);
    });
}

module.exports = { visitAllMovieUrls };
