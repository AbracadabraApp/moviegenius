const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    concurrency: 4,           // Number of concurrent tabs
    pageTimeout: 120000,      // 2 minutes max per page
    smartTimeout: 45000,      // Max wait for smart detection
    delayBetweenTabs: 500,    // Stagger tab starts
    progressInterval: 5,      // Progress updates every N completions
    retryAttempts: 2,         // Retry failed pages
    logLevel: 'detailed'      // 'basic' | 'detailed' | 'verbose'
};

async function visitAllMovieUrls(startOffset = 0, options = {}) {
    const config = { ...CONFIG, ...options };
    
    console.log('🚀 Starting optimized bulk URL visitor...');
    console.log(`⚙️  Config: ${config.concurrency} tabs, smart detection enabled`);
    
    // Read the extracted URLs
    const movieData = JSON.parse(fs.readFileSync('extracted-movie-urls.json', 'utf8'));
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
        movieResults: new Map() // Track individual movie results
    };
    
    // Create progress log file
    const logFile = `bulk-crawler-${Date.now()}.log`;
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
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
            const result = await processMovie(page, movie, globalIndex, movies.length + startOffset, config);
            
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
        console.log(`${status} [${globalIndex}/${totalMovies}] ${movie.title} (${(duration/1000).toFixed(1)}s, ${method})`);
    }
    
    return {
        ...result,
        movie,
        duration,
        globalIndex
    };
}

/**
 * Smart loading detection - waits for "Explore Further" content
 */
async function navigateWithSmartDetection(page, url, config) {
    try {
        // Start navigation
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: config.pageTimeout 
        });
        
        // Smart detection: wait for "Explore Further" content
        const smartDetected = await Promise.race([
            // Wait for high-value content indicator
            page.waitForFunction(
                () => {
                    const content = document.body.innerText || '';
                    return content.includes('Explore Further') || 
                           content.includes('More Ideas') ||
                           content.includes('Similar Movies') ||
                           (content.length > 5000 && content.includes('Analysis'));
                },
                { timeout: config.smartTimeout }
            ).then(() => true),
            
            // Fallback: wait for network idle
            new Promise(resolve => setTimeout(resolve, config.smartTimeout))
                .then(() => false)
        ]).catch(() => false);
        
        // Additional brief wait for any final content loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            smartDetected,
            method: smartDetected ? 'smart-content' : 'network-idle'
        };
        
    } catch (error) {
        return {
            success: false,
            smartDetected: false,
            error: error.message,
            method: 'failed'
        };
    }
}

/**
 * Update progress tracking atomically
 */
function updateProgress(progress, result, movie, logFile) {
    if (result.success) {
        progress.visited++;
        if (result.smartDetected) {
            progress.smartDetected++;
        }
    } else {
        progress.errors++;
        if (result.error && result.error.includes('timeout')) {
            progress.timeouts++;
        }
    }
    
    // Store individual movie result
    progress.movieResults.set(movie.title, {
        success: result.success,
        duration: result.duration,
        method: result.method,
        timestamp: new Date().toISOString()
    });
    
    // Append to log file
    const logEntry = `${new Date().toISOString()},${result.globalIndex},${movie.title},${result.success},${result.duration},${result.method}\n`;
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
    console.log(`   ✅ Completed: ${totalCompleted}/${totalMovies} (${(totalCompleted/totalMovies*100).toFixed(1)}%)`);
    console.log(`   🎯 Smart detection: ${progress.smartDetected}/${progress.visited} (${(progress.smartDetected/progress.visited*100).toFixed(1)}%)`);
    console.log(`   ❌ Errors: ${progress.errors} | ⏰ Timeouts: ${progress.timeouts}`);
    console.log(`   ⚡ Rate: ${rate.toFixed(1)} movies/sec | 🕐 ETA: ${(eta/60).toFixed(1)} min\n`);
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
    console.log(`   ✅ Success rate: ${(progress.visited/(progress.visited + progress.errors)*100).toFixed(1)}%`);
    console.log(`   🎯 Smart detection: ${progress.smartDetected}/${progress.visited} (${(progress.smartDetected/progress.visited*100).toFixed(1)}%)`);
    console.log(`\n⏱️  PERFORMANCE:`);
    console.log(`   ⏰ Total time: ${(totalTime/60).toFixed(1)} minutes`);
    console.log(`   ⚡ Average rate: ${(progress.visited/totalTime).toFixed(2)} movies/second`);
    console.log(`   🚀 Estimated speedup: ${(CONFIG.concurrency * 2).toFixed(1)}x vs old script`);
    console.log(`\n📝 DETAILED LOG: ${logFile}`);
    console.log(`   Use this file for analysis and debugging`);
    console.log(`═══════════════════════════════════════\n`);
}

// Run the bulk visitor
if (require.main === module) {
    // Get offset from command line argument (e.g., node bulk-visit-crawler.js 100)
    const startOffset = parseInt(process.argv[2]) || 0;
    
    visitAllMovieUrls(startOffset)
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