// Step 2: Check which TMDB IDs are missing - with pagination
const fs = require('fs');

console.log('🔍 Step 2: Checking which TMDB IDs are missing from database (with pagination)');

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

async function getAllTmdbIds() {
  const allIds = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const url = `https://tjvaplqqibvlmazdvcwx.supabase.co/rest/v1/movies?select=tmdb_id&limit=${limit}&offset=${offset}`;
    const headers = {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`📡 Fetching batch ${Math.floor(offset/limit) + 1} (offset: ${offset})...`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const batch = await response.json();
    
    if (batch.length === 0) {
      break; // No more data
    }
    
    allIds.push(...batch.map(movie => movie.tmdb_id).filter(id => id !== null));
    
    if (batch.length < limit) {
      break; // Last batch
    }
    
    offset += limit;
  }
  
  return allIds;
}

async function checkMissingIds() {
  try {
    // Read the extracted TMDB IDs
    const tmdbData = JSON.parse(fs.readFileSync('tmdb-ids.json', 'utf8'));
    const allIds = tmdbData.tmdbIds;
    
    console.log(`📋 Checking ${allIds.length} TMDB IDs...`);
    
    // Get all existing TMDB IDs from database
    const existingIds = new Set(await getAllTmdbIds());
    
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

checkMissingIds();