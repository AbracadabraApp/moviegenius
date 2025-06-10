// Step 2: Check which TMDB IDs are missing - Simple HTTP approach
const fs = require('fs');
const https = require('https');

console.log('🔍 Step 2: Checking which TMDB IDs are missing from database');

async function checkMissingIds() {
  try {
    // Read the extracted TMDB IDs
    const tmdbData = JSON.parse(fs.readFileSync('tmdb-ids.json', 'utf8'));
    const allIds = tmdbData.tmdbIds;
    
    console.log(`📋 Checking ${allIds.length} TMDB IDs...`);
    
    // Query Supabase API directly - with high limit to get all rows (1383 total)
    const url = 'https://tjvaplqqibvlmazdvcwx.supabase.co/rest/v1/movies?select=tmdb_id&limit=2000';
    const headers = {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };
    
    console.log('📡 Querying database...');
    
    // Make the HTTP request
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const existingMovies = await response.json();
    
    // Extract existing IDs
    const existingIds = new Set(existingMovies.map(movie => movie.tmdb_id).filter(id => id !== null));
    
    // Find missing IDs
    const missingIds = allIds.filter(id => !existingIds.has(id));
    
    console.log(`✅ Found ${existingIds.size} existing movies in database`);
    console.log(`❌ Found ${missingIds.length} missing movies`);
    console.log(`📊 Coverage: ${((existingIds.size / allIds.length) * 100).toFixed(1)}%`);
    
    // Save results
    const results = {
      total: allIds.length,
      existing: existingIds.size,
      missing: missingIds.length,
      missingIds: missingIds.sort((a, b) => a - b),
      checkedAt: new Date().toISOString()
    };
    
    fs.writeFileSync('missing-tmdb-ids.json', JSON.stringify(results, null, 2));
    
    console.log('💾 Results saved to missing-tmdb-ids.json');
    console.log(`🔢 Sample missing IDs: ${missingIds.slice(0, 10).join(', ')}...`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

checkMissingIds();