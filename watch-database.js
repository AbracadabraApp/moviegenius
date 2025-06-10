// Database Watcher - Monitor for new movies being added
const fs = require('fs');

// Add fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

console.log('👀 Database Watcher - Monitoring for new movies');
console.log('🎬 Click on movie cards now and I\'ll watch for new entries...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let movieCount = 0;
let knownMovies = new Set();
let watchInterval;

async function getMovieCount() {
  try {
    const headers = {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };
    
    const response = await fetch('https://tjvaplqqibvlmazdvcwx.supabase.co/rest/v1/movies?select=count', { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data[0]?.count || 0;
    
  } catch (error) {
    console.error('❌ Error checking movie count:', error.message);
    return movieCount; // Return last known count
  }
}

async function getRecentMovies(limit = 5) {
  try {
    const headers = {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`https://tjvaplqqibvlmazdvcwx.supabase.co/rest/v1/movies?select=tmdb_id,title,year,slug,created_at&order=created_at.desc&limit=${limit}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('❌ Error fetching recent movies:', error.message);
    return [];
  }
}

async function watchDatabase() {
  const currentCount = await getMovieCount();
  
  if (movieCount === 0) {
    // First run - establish baseline
    movieCount = currentCount;
    console.log(`📊 Baseline: ${movieCount} movies in database`);
    console.log(`⏰ Started watching at ${new Date().toLocaleTimeString()}`);
    console.log('');
    
    // Get current recent movies to establish baseline
    const recentMovies = await getRecentMovies(10);
    recentMovies.forEach(movie => {
      knownMovies.add(movie.tmdb_id);
    });
    
  } else if (currentCount > movieCount) {
    // New movies detected!
    const newCount = currentCount - movieCount;
    console.log(`🚨 NEW MOVIES DETECTED! +${newCount} movies added`);
    console.log(`📈 Count: ${movieCount} → ${currentCount}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    
    // Get the newly added movies
    const recentMovies = await getRecentMovies(newCount + 2);
    const newMovies = recentMovies.filter(movie => !knownMovies.has(movie.tmdb_id));
    
    if (newMovies.length > 0) {
      console.log('🎬 New Movies Added:');
      newMovies.forEach((movie, index) => {
        console.log(`   ${index + 1}. TMDB ID: ${movie.tmdb_id} | ${movie.title} (${movie.year}) | "${movie.slug}"`);
        knownMovies.add(movie.tmdb_id);
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    movieCount = currentCount;
  }
  
  // Show a heartbeat every 30 seconds when no changes
  if (Date.now() % 30000 < 3000) {
    process.stdout.write(`💓 Watching... (${movieCount} movies) ${new Date().toLocaleTimeString()}\\r`);
  }
}

async function startWatching() {
  const config = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('Run with: SUPABASE_SERVICE_ROLE_KEY="your-key" node watch-database.js');
    process.exit(1);
  }
  
  // Initial check
  await watchDatabase();
  
  // Check every 3 seconds
  watchInterval = setInterval(watchDatabase, 3000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n\\n🛑 Stopping database watcher...');
    clearInterval(watchInterval);
    process.exit(0);
  });
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log('👀 Database Watcher - Monitor for new movies');
  console.log('');
  console.log('Usage:');
  console.log('  SUPABASE_SERVICE_ROLE_KEY="your-key" node watch-database.js');
  console.log('');
  console.log('This script will monitor your Supabase database for new movies');
  console.log('being added in real-time as you click on movie cards.');
  console.log('');
  console.log('Press Ctrl+C to stop watching.');
  process.exit(0);
}

startWatching().catch(error => {
  console.error('❌ Watcher failed to start:', error.message);
  process.exit(1);
});