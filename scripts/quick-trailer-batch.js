/**
 * Quick Trailer Batch Populator
 *
 * Uses curl to call our trailer API for popular TMDB IDs
 * Simple approach without complex dependencies
 */

// Popular TMDB IDs to test with
const popularMovieIds = [
  550, // Fight Club
  603, // The Matrix
  155, // The Dark Knight
  13, // Forrest Gump
  680, // Pulp Fiction
  769, // GoodFellas
  19404, // Dilwale Dulhania Le Jayenge
  278, // The Shawshank Redemption
  238, // The Godfather
  424, // Schindler's List
  389, // 12 Angry Men
  129, // Spirited Away
  346, // Seven
  12477, // Grave of the Fireflies
  11216, // Cinema Paradiso
  637, // Life Is Beautiful
  496243, // Parasite
  372058, // Your Name
  1396, // Breaking Bad (series)
  15804, // A Clockwork Orange
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/tmdb-trailer`;
const DELAY_MS = 250; // Rate limiting

console.log('🎬 Quick Trailer Batch Populator');
console.log(`📊 Processing ${popularMovieIds.length} popular movies`);

let processed = 0;
let found = 0;
let cached = 0;

async function processMovie(tmdbId) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`curl -s "${API_BASE}?tmdbId=${tmdbId}"`);
    const result = JSON.parse(stdout);

    processed++;

    if (result.videoId) {
      if (result.source === 'cache') {
        cached++;
        console.log(
          `🚀 [${processed}/${popularMovieIds.length}] TMDB ${tmdbId} - Cached: ${result.videoId}`
        );
      } else {
        found++;
        console.log(
          `✅ [${processed}/${popularMovieIds.length}] TMDB ${tmdbId} - Found: ${result.videoId}`
        );
      }
    } else {
      console.log(`❌ [${processed}/${popularMovieIds.length}] TMDB ${tmdbId} - No trailer`);
    }
  } catch (error) {
    console.error(
      `💥 [${processed}/${popularMovieIds.length}] TMDB ${tmdbId} - Error:`,
      error.message
    );
  }
}

async function runBatch() {
  for (const tmdbId of popularMovieIds) {
    await processMovie(tmdbId);

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  console.log('\n📊 Batch Results:');
  console.log(`  • Processed: ${processed}`);
  console.log(`  • New trailers found: ${found}`);
  console.log(`  • Already cached: ${cached}`);
  console.log(`  • Total with trailers: ${found + cached}`);
  console.log(`  • Success rate: ${(((found + cached) / processed) * 100).toFixed(1)}%`);
}

runBatch();
