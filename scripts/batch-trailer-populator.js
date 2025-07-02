/**
 * Batch Trailer Populator
 * 
 * Fetches and caches trailer URLs for all movies in the database
 * Uses enhanced trailer search with multiple fallback strategies
 * 
 * Usage: node scripts/batch-trailer-populator.js
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BATCH_SIZE = 50; // Process in batches to avoid rate limits
const DELAY_MS = 100; // Delay between API calls

let stats = {
  processed: 0,
  foundTrailers: 0,
  noTrailerFound: 0,
  errors: 0,
  totalMovies: 0
};

/**
 * Enhanced trailer search with multiple fallback strategies
 */
async function findBestTrailerEnhanced(tmdbId, movieTitle, movieYear) {
  try {
    // TMDB videos endpoint
    const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!response.ok || !data.results || data.results.length === 0) {
      console.log(`No TMDB videos for "${movieTitle}" (${movieYear})`);
      return null;
    }

    // Strategy 1: Look for official trailers
    const trailer = findBestTrailerFromResults(data.results);
    if (trailer) {
      return {
        videoId: trailer.key,
        source: 'tmdb_official',
        title: trailer.name,
        type: trailer.type
      };
    }

    // Strategy 2: Expand to other video types
    const alternativeVideo = findAlternativeVideo(data.results);
    if (alternativeVideo) {
      return {
        videoId: alternativeVideo.key,
        source: 'tmdb_alternative',
        title: alternativeVideo.name,
        type: alternativeVideo.type
      };
    }

    console.log(`No suitable videos found for "${movieTitle}" (${movieYear})`);
    return null;

  } catch (error) {
    console.error(`Error fetching trailer for TMDB ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Find best trailer from TMDB results (improved version)
 */
function findBestTrailerFromResults(videos) {
  if (!videos || videos.length === 0) return null;

  // Filter to YouTube videos only
  const youtubeVideos = videos.filter(video => video.site === 'YouTube');
  if (youtubeVideos.length === 0) return null;

  // Scoring function for trailer quality
  const scoreVideo = (video) => {
    let score = 0;
    const name = video.name.toLowerCase();
    const type = video.type.toLowerCase();

    // Highest priority: Official trailers
    if (video.official === true) score += 20;
    if (type === 'trailer') score += 15;
    
    // High priority keywords
    if (name.includes('official')) score += 10;
    if (name.includes('main') || name.includes('theatrical')) score += 8;
    if (name.includes('final')) score += 5;
    
    // Medium priority
    if (type === 'teaser') score += 3;
    if (name.includes('new')) score += 2;
    
    // Avoid unwanted content
    if (name.includes('clip') || name.includes('scene')) score -= 5;
    if (name.includes('behind') || name.includes('making')) score -= 3;
    if (name.includes('deleted')) score -= 8;

    return score;
  };

  // Score and sort
  const scored = youtubeVideos.map(video => ({
    ...video,
    score: scoreVideo(video)
  }));

  scored.sort((a, b) => b.score - a.score);
  
  // Return best scoring video with positive score
  return scored[0]?.score > 0 ? scored[0] : null;
}

/**
 * Find alternative video types when no official trailer exists
 */
function findAlternativeVideo(videos) {
  const youtubeVideos = videos.filter(video => video.site === 'YouTube');
  if (youtubeVideos.length === 0) return null;

  // Priority order for alternative video types
  const typePreference = ['Teaser', 'TV Spot', 'Featurette', 'Clip'];
  
  for (const preferredType of typePreference) {
    const matching = youtubeVideos.filter(v => v.type === preferredType);
    if (matching.length > 0) {
      // Return the first official one, or just the first one
      return matching.find(v => v.official === true) || matching[0];
    }
  }

  // Fallback: return any YouTube video
  return youtubeVideos[0];
}

/**
 * Process a batch of movies
 */
async function processBatch(movies) {
  for (const movie of movies) {
    try {
      stats.processed++;
      
      console.log(`[${stats.processed}/${stats.totalMovies}] Processing: "${movie.title}" (${movie.year})`);
      
      const trailerData = await findBestTrailerEnhanced(movie.tmdb_id, movie.title, movie.year);
      
      if (trailerData) {
        // Update database with trailer URL
        const { error } = await supabase
          .from('movies')
          .update({ trailer_url: trailerData.videoId })
          .eq('id', movie.id);

        if (error) {
          console.error(`Failed to update trailer for "${movie.title}":`, error);
          stats.errors++;
        } else {
          console.log(`✅ Found trailer: "${movie.title}" -> ${trailerData.videoId} (${trailerData.source})`);
          stats.foundTrailers++;
        }
      } else {
        stats.noTrailerFound++;
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      
    } catch (error) {
      console.error(`Error processing "${movie.title}":`, error);
      stats.errors++;
    }
  }
}

/**
 * Main execution function
 */
async function populateTrailers() {
  console.log('🎬 Starting batch trailer population...');
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    // Get count of movies without trailers
    const { count } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null);

    stats.totalMovies = count;
    console.log(`📊 Found ${count} movies without trailers`);

    if (count === 0) {
      console.log('✅ All movies already have trailers!');
      return;
    }

    // Process in batches
    let offset = 0;
    while (offset < count) {
      console.log(`\n🔄 Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}/${Math.ceil(count/BATCH_SIZE)}`);
      
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .not('tmdb_id', 'is', null)
        .is('trailer_url', null)
        .range(offset, offset + BATCH_SIZE - 1)
        .order('created_at', { ascending: false }); // Process newest first

      if (error) {
        console.error('Database error:', error);
        break;
      }

      if (!movies || movies.length === 0) {
        break;
      }

      await processBatch(movies);
      offset += BATCH_SIZE;
    }

    // Final stats
    console.log('\n📈 Batch trailer population complete!');
    console.log(`📊 Stats:`);
    console.log(`  • Total processed: ${stats.processed}`);
    console.log(`  • Trailers found: ${stats.foundTrailers}`);
    console.log(`  • No trailer found: ${stats.noTrailerFound}`);
    console.log(`  • Errors: ${stats.errors}`);
    console.log(`  • Success rate: ${((stats.foundTrailers/stats.processed)*100).toFixed(1)}%`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateTrailers();
}

export { findBestTrailerEnhanced };