const puppeteer = require('puppeteer');
const fs = require('fs');

async function visitAllMovieUrls(startOffset = 0) {
    console.log('Starting bulk URL visitor...');
    
    // Read the extracted URLs
    const movieData = JSON.parse(fs.readFileSync('extracted-movie-urls.json', 'utf8'));
    console.log(`Found ${movieData.length} URLs to visit`);
    
    // Apply offset if provided
    const urlsToVisit = movieData.slice(startOffset);
    console.log(`Starting from index ${startOffset}, visiting ${urlsToVisit.length} URLs`);
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track progress
    let visited = 0;
    let errors = 0;
    const startTime = Date.now();
    
    try {
        for (const movie of urlsToVisit) {
            try {
                console.log(`[${startOffset + visited + 1}/${movieData.length}] Visiting: ${movie.title}`);
                
                // Visit the URL
                await page.goto(movie.url, { 
                    waitUntil: 'networkidle0',
                    timeout: 90000 
                });
                
                console.log(`✅ Successfully loaded: ${movie.title}`);
                
                // Small delay to be respectful, then move to next page
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                visited++;
                
                // Progress update every 10 visits (since we're going slower)
                if (visited % 10 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const rate = visited / elapsed;
                    const totalVisited = startOffset + visited;
                    const remaining = movieData.length - totalVisited;
                    const eta = remaining / rate;
                    
                    console.log(`✅ Progress: ${totalVisited}/${movieData.length} (${(totalVisited/movieData.length*100).toFixed(1)}%)`);
                    console.log(`⏱️  Rate: ${rate.toFixed(1)} pages/sec | ETA: ${(eta/60).toFixed(1)} minutes`);
                }
                
            } catch (error) {
                errors++;
                console.log(`❌ Error visiting ${movie.title}: ${error.message}`);
            }
        }
        
    } finally {
        await browser.close();
        
        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`\n🏁 Completed!`);
        console.log(`✅ Successfully visited: ${visited}/${urlsToVisit.length} URLs (${startOffset + visited}/${movieData.length} total)`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`⏱️  Total time: ${(totalTime/60).toFixed(1)} minutes`);
        console.log(`📊 Average rate: ${(visited/totalTime).toFixed(1)} pages/second`);
    }
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