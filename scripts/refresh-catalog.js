#!/usr/bin/env node
// scripts/refresh-catalog.js - Daily catalog refresh job
// Fetches TMDB new releases and uses UseOnce policy to persist + enrich
//
// Run manually: node scripts/refresh-catalog.js
// Railway cron: Runs daily at 6 AM UTC

import { ensureMovieInDb, triggerEnrichment } from '../lib/services/tmdb-persist.js';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error('❌ TMDB API key not configured');
  process.exit(1);
}

/**
 * Fetch movies from a TMDB endpoint
 */
async function fetchTMDBCategory(endpoint, categoryName) {
  try {
    const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`  ✅ Fetched ${categoryName}: ${data.results?.length || 0} movies`);

    return data.results || [];
  } catch (error) {
    console.error(`  ❌ Failed to fetch ${categoryName}:`, error.message);
    return [];
  }
}

/**
 * Main refresh function
 */
async function refreshCatalog() {
  console.log('🔄 Starting catalog refresh...');
  console.log(`   Time: ${new Date().toISOString()}`);

  const startTime = Date.now();
  let totalMovies = 0;
  let newMovies = 0;
  let enrichedMovies = 0;

  // Define TMDB endpoints to fetch
  const categories = [
    { endpoint: '/movie/now_playing', name: 'Now Playing' },
    { endpoint: '/movie/upcoming', name: 'Upcoming' },
    { endpoint: '/trending/movie/week', name: 'Trending This Week' },
    { endpoint: '/movie/popular', name: 'Popular' }
  ];

  // Fetch all categories in parallel
  const results = await Promise.allSettled(
    categories.map(cat => fetchTMDBCategory(cat.endpoint, cat.name))
  );

  // Collect all movies
  const allMovies = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Deduplicate by TMDB ID
  const uniqueMovies = Array.from(
    new Map(allMovies.map(m => [m.id, m])).values()
  );

  console.log(`\n📊 Found ${uniqueMovies.length} unique movies across ${categories.length} categories`);
  console.log('   Persisting to database...\n');

  // Process each movie with UseOnce policy
  for (const movie of uniqueMovies) {
    try {
      // Phase 1: Ensure movie exists in DB
      const result = await ensureMovieInDb(movie);
      totalMovies++;

      if (result.isNew) {
        newMovies++;
        console.log(`  🆕 New: ${movie.title} (${movie.release_date?.substring(0, 4) || 'N/A'})`);

        // Phase 2: Trigger background enrichment (async)
        triggerEnrichment(movie.id).catch(err => {
          console.error(`  ⚠️  Enrichment failed for ${movie.title}:`, err.message);
        });
        enrichedMovies++;
      }

    } catch (error) {
      console.error(`  ❌ Failed to process ${movie.title}:`, error.message);
    }

    // Rate limiting - don't hammer the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ Catalog refresh complete!');
  console.log(`   Total movies: ${totalMovies}`);
  console.log(`   New movies: ${newMovies}`);
  console.log(`   Enrichment triggered for: ${enrichedMovies} movies`);
  console.log(`   Duration: ${duration}s`);

  return {
    totalMovies,
    newMovies,
    enrichedMovies,
    duration: parseFloat(duration),
    timestamp: new Date().toISOString()
  };
}

// Run the refresh
refreshCatalog()
  .then(result => {
    console.log('\n📝 Job summary:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
