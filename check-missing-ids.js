// Step 2: Check which TMDB IDs are missing from the database
const fs = require('fs');

// Use fetch for Node.js if needed
if (!globalThis.fetch) {
  const { fetch } = require('undici');
  globalThis.fetch = fetch;
}

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Step 2: Checking which TMDB IDs are missing from database');

async function checkMissingIds() {
  try {
    // Read the extracted TMDB IDs
    const tmdbData = JSON.parse(fs.readFileSync('tmdb-ids.json', 'utf8'));
    const allIds = tmdbData.tmdbIds;
    
    console.log(`📋 Checking ${allIds.length} TMDB IDs...`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Query database for existing TMDB IDs
    const { data: existingMovies, error } = await supabase
      .from('movies')
      .select('tmdb_id')
      .in('tmdb_id', allIds);
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    // Extract existing IDs
    const existingIds = new Set(existingMovies.map(movie => movie.tmdb_id));
    
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