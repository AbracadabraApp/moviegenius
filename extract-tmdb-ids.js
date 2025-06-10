// Step 1: Extract TMDB IDs from all-movie-urls.html
const fs = require('fs');
const path = require('path');

console.log('🎬 Step 1: Extracting TMDB IDs from all-movie-urls.html');

try {
  // Read the HTML file
  const htmlPath = path.join(__dirname, 'all-movie-urls.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract all URLs matching the pattern: https://moviegenius.ai/movie/[number]
  const urlPattern = /https:\/\/moviegenius\.ai\/movie\/(\d+)/g;
  const matches = [...htmlContent.matchAll(urlPattern)];
  
  // Extract TMDB IDs and remove duplicates
  const tmdbIds = [...new Set(matches.map(match => parseInt(match[1])))].sort((a, b) => a - b);
  
  console.log(`📊 Found ${matches.length} total URLs`);
  console.log(`🔢 Found ${tmdbIds.length} unique TMDB IDs`);
  console.log(`📈 Range: ${Math.min(...tmdbIds)} to ${Math.max(...tmdbIds)}`);
  
  // Save to JSON file for next steps
  const outputData = {
    totalUrls: matches.length,
    uniqueIds: tmdbIds.length,
    tmdbIds: tmdbIds,
    extractedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('tmdb-ids.json', JSON.stringify(outputData, null, 2));
  
  console.log('✅ TMDB IDs extracted and saved to tmdb-ids.json');
  console.log(`📋 Sample IDs: ${tmdbIds.slice(0, 10).join(', ')}...`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}