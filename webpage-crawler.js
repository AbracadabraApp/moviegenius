const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    htmlFile: 'movie-urls-complete.html',
    logFile: 'crawler.log',
    maxTimeout: 90000,        // 90 seconds max per page
    interval: 4000,           // 4 seconds between requests
    maxTabs: 3,               // Maximum concurrent tabs
    errorWindow: 10,          // Check errors every 10 movies
    startTabs: 1,             // Start with 1 tab for stability
    retryAttempts: 2          // Retry failed movies
};

class SimpleWebpageCrawler {
    constructor() {
        this.browser = null;
        this.currentTabs = CONFIG.startTabs;
        this.processedCount = 0;
        this.errorCount = 0;
        this.totalMovies = 0;
        this.recentErrors = [];
        this.startTime = Date.now();
        this.resumeIndex = 0;
        this.smartContentCount = 0;
        this.timeoutFallbackCount = 0;
        this.analysisGeneratedCount = 0;
        
        // Initialize log file
        this.initializeLog();
    }

    initializeLog() {
        const logHeader = `
========================================
🎬 MovieGenius Simple Webpage Crawler
========================================
Started: ${new Date().toISOString()}
Config: ${JSON.stringify(CONFIG, null, 2)}
========================================

`;
        
        // Check for existing log to determine resume point
        if (fs.existsSync(CONFIG.logFile)) {
            const existingLog = fs.readFileSync(CONFIG.logFile, 'utf8');
            const lines = existingLog.split('\n').filter(line => line.includes('SUCCESS:') || line.includes('ERROR:'));
            this.resumeIndex = lines.length;
            
            if (this.resumeIndex > 0) {
                console.log(`📍 Resume detected: Starting from movie #${this.resumeIndex + 1}`);
                fs.appendFileSync(CONFIG.logFile, `\n📍 RESUMING: Starting from movie #${this.resumeIndex + 1} at ${new Date().toISOString()}\n`);
            }
        } else {
            fs.writeFileSync(CONFIG.logFile, logHeader);
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logLine = `${timestamp} - ${message}`;
        console.log(message);
        fs.appendFileSync(CONFIG.logFile, logLine + '\n');
    }

    async initialize() {
        this.log('🚀 Launching browser...');
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        // Load the HTML file to get movie URLs
        this.log('📄 Loading movie URLs from webpage...');
        const page = await this.browser.newPage();
        const htmlPath = path.resolve(CONFIG.htmlFile);
        await page.goto(`file://${htmlPath}`);

        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract all movie URLs
        const movieData = await page.evaluate(() => {
            // Try multiple ways to get the data
            if (window.movieData && Array.isArray(window.movieData)) {
                return window.movieData;
            }
            
            // Fallback: extract from links if JavaScript failed
            const links = Array.from(document.querySelectorAll('a[href*="/movie/"]'));
            return links.map((link, index) => {
                const url = link.href;
                const title = link.textContent.trim();
                const tmdbIdMatch = url.match(/\/movie\/(\d+)/);
                return {
                    number: index + 1,
                    title: title || `Movie ${index + 1}`,
                    url: url,
                    tmdbId: tmdbIdMatch ? parseInt(tmdbIdMatch[1]) : null
                };
            });
        });

        this.totalMovies = movieData.length;
        this.log(`📊 Found ${this.totalMovies} total movies to process`);
        
        await page.close();
        return movieData;
    }

    async processMovie(page, movie, index) {
        const movieNumber = index + 1;
        const startTime = Date.now();
        
        try {
            this.log(`🎬 [${movieNumber}/${this.totalMovies}] Processing: ${movie.title}`);
            
            // Navigate to movie page
            const response = await page.goto(movie.url, {
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.maxTimeout
            });

            if (!response || response.status() >= 400) {
                throw new Error(`HTTP ${response?.status() || 'UNKNOWN'}: ${response?.statusText() || 'No response'}`);
            }

            // Smart detection: wait for "Explore Further" content
            const contentDetected = await Promise.race([
                // Wait for high-value content indicator
                page.waitForFunction(() => {
                    const content = document.body.innerText || '';
                    return content.includes('Explore Further') || 
                           content.includes('More Ideas') ||
                           content.includes('Similar Movies') ||
                           (content.length > 3000 && content.includes('Analysis'));
                }, { timeout: CONFIG.maxTimeout }).then(() => true),
                
                // Fallback timeout
                new Promise(resolve => setTimeout(() => resolve(false), CONFIG.maxTimeout))
            ]).catch(() => false);

            // Check if analysis was actually generated (more detailed check)
            const analysisCheck = await page.evaluate(() => {
                const content = document.body.innerText || '';
                return {
                    hasExploreContent: content.includes('Explore Further'),
                    hasMoreIdeas: content.includes('More Ideas'),
                    hasSimilarMovies: content.includes('Similar Movies'),
                    hasAnalysisText: content.includes('Analysis') && content.length > 3000,
                    contentLength: content.length,
                    hasRichContent: content.length > 2000
                };
            });

            const duration = Date.now() - startTime;
            const method = contentDetected ? 'smart-content' : 'timeout-fallback';
            
            // Track detailed metrics
            if (contentDetected) {
                this.smartContentCount++;
            } else {
                this.timeoutFallbackCount++;
            }
            
            if (analysisCheck.hasExploreContent || analysisCheck.hasMoreIdeas) {
                this.analysisGeneratedCount++;
            }
            
            // Enhanced logging with analysis details
            const analysisStatus = analysisCheck.hasExploreContent ? '🎯' : 
                                 analysisCheck.hasMoreIdeas ? '💡' : 
                                 analysisCheck.hasRichContent ? '📄' : '⚪';
            
            this.log(`✅ SUCCESS: [${movieNumber}] ${movie.title} (${(duration/1000).toFixed(1)}s, ${method}) ${analysisStatus} ${analysisCheck.contentLength} chars`);
            this.processedCount++;
            
            return { 
                success: true, 
                duration, 
                method,
                analysisGenerated: analysisCheck.hasExploreContent || analysisCheck.hasMoreIdeas,
                contentLength: analysisCheck.contentLength
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.log(`❌ ERROR: [${movieNumber}] ${movie.title} - ${error.message} (${(duration/1000).toFixed(1)}s)`);
            this.errorCount++;
            this.recentErrors.push(movieNumber);
            
            // Keep only recent errors
            if (this.recentErrors.length > CONFIG.errorWindow) {
                this.recentErrors.shift();
            }
            
            return { success: false, duration, error: error.message };
        }
    }

    adjustConcurrency() {
        const recentErrorRate = this.recentErrors.length / Math.min(CONFIG.errorWindow, this.processedCount + this.errorCount);
        
        // More tolerant scaling - allow up to 20% error rate before scaling down
        if (recentErrorRate <= 0.1 && this.currentTabs < CONFIG.maxTabs) {
            // Low error rate, scale up
            this.currentTabs++;
            this.log(`📈 SCALING UP: Increased to ${this.currentTabs} tabs (${(recentErrorRate*100).toFixed(1)}% error rate)`);
        } else if (recentErrorRate > 0.2 && this.currentTabs > 1) {
            // High error rate, scale down
            this.currentTabs = Math.max(1, this.currentTabs - 1);
            this.log(`📉 SCALING DOWN: Reduced to ${this.currentTabs} tab(s) (${(recentErrorRate*100).toFixed(1)}% error rate)`);
            this.recentErrors = []; // Reset error window after scaling down
        }
    }

    async processMoviesConcurrently(movies) {
        const workers = [];
        let movieIndex = this.resumeIndex;
        
        // Create worker function
        const createWorker = async () => {
            const page = await this.browser.newPage();
            await page.setUserAgent('MovieGenius-WebpageCrawler/1.0');
            await page.setViewport({ width: 1200, height: 800 });
            
            while (movieIndex < movies.length) {
                const currentIndex = movieIndex++;
                if (currentIndex >= movies.length) break;
                
                const movie = movies[currentIndex];
                await this.processMovie(page, movie, currentIndex);
                
                // Wait interval between requests
                await new Promise(resolve => setTimeout(resolve, CONFIG.interval));
                
                // Check for scaling every 10 movies
                if ((this.processedCount + this.errorCount) % CONFIG.errorWindow === 0) {
                    this.adjustConcurrency();
                    this.printProgress();
                }
            }
            
            await page.close();
        };

        // Start with initial tab count
        for (let i = 0; i < this.currentTabs; i++) {
            workers.push(createWorker());
        }

        await Promise.all(workers);
    }

    printProgress() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const completed = this.processedCount + this.errorCount;
        const rate = completed / elapsed;
        const remaining = this.totalMovies - completed;
        const eta = remaining / rate;
        const successRate = this.processedCount / completed * 100;

        const analysisRate = this.analysisGeneratedCount / this.processedCount * 100;
        
        this.log(`\n📊 PROGRESS REPORT:`);
        this.log(`   ✅ Completed: ${completed}/${this.totalMovies} (${(completed/this.totalMovies*100).toFixed(1)}%)`);
        this.log(`   🎯 Success Rate: ${successRate.toFixed(1)}% (${this.processedCount} success, ${this.errorCount} errors)`);
        this.log(`   🧠 Analysis Generated: ${this.analysisGeneratedCount}/${this.processedCount} (${analysisRate.toFixed(1)}%)`);
        this.log(`   ⚡ Smart Detection: ${this.smartContentCount} | ⏰ Timeouts: ${this.timeoutFallbackCount}`);
        this.log(`   🚀 Current Tabs: ${this.currentTabs}`);
        this.log(`   📈 Rate: ${rate.toFixed(2)} movies/sec | 🕐 ETA: ${(eta/60).toFixed(1)} minutes\n`);
    }

    async run() {
        try {
            // Initialize browser and load movie data
            const movies = await this.initialize();
            
            if (this.resumeIndex >= movies.length) {
                this.log('🎉 All movies already processed!');
                return;
            }
            
            this.log(`🎯 Processing ${movies.length - this.resumeIndex} movies (starting from #${this.resumeIndex + 1})`);
            this.log(`⚙️  Config: ${this.currentTabs} initial tabs, ${CONFIG.maxTimeout/1000}s timeout, ${CONFIG.interval/1000}s intervals\n`);
            
            // Process all movies
            await this.processMoviesConcurrently(movies);
            
            // Final report
            this.printFinalReport();
            
        } catch (error) {
            this.log(`💥 CRAWLER ERROR: ${error.message}`);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    printFinalReport() {
        const totalTime = (Date.now() - this.startTime) / 1000;
        const successRate = this.processedCount / (this.processedCount + this.errorCount) * 100;
        
        const analysisRate = this.analysisGeneratedCount / this.processedCount * 100;
        
        this.log(`\n🎉 CRAWLER COMPLETED!`);
        this.log(`==========================================`);
        this.log(`📊 FINAL RESULTS:`);
        this.log(`   🎬 Movies Processed: ${this.processedCount}/${this.totalMovies}`);
        this.log(`   ✅ Success Rate: ${successRate.toFixed(1)}%`);
        this.log(`   🧠 Analysis Generated: ${this.analysisGeneratedCount} (${analysisRate.toFixed(1)}%)`);
        this.log(`   ⚡ Smart Detection: ${this.smartContentCount} | ⏰ Timeouts: ${this.timeoutFallbackCount}`);
        this.log(`   ❌ Errors: ${this.errorCount}`);
        this.log(`   ⏱️  Total Time: ${(totalTime/60).toFixed(1)} minutes`);
        this.log(`   📈 Average Rate: ${(this.processedCount/totalTime).toFixed(2)} movies/second`);
        this.log(`   📁 Log File: ${CONFIG.logFile}`);
        this.log(`==========================================\n`);
    }
}

// Shared index for concurrent workers
let sharedMovieIndex = 0;
function getNextMovieIndex() {
    return sharedMovieIndex++;
}

// Run crawler if called directly
if (require.main === module) {
    const crawler = new SimpleWebpageCrawler();
    
    crawler.run()
        .then(() => {
            console.log('✅ Webpage crawler completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Webpage crawler failed:', error);
            process.exit(1);
        });
}

module.exports = { SimpleWebpageCrawler };