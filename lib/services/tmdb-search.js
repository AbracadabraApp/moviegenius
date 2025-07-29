/**
 * TMDB Search Service
 *
 * Handles TMDB API interactions for movie discovery
 * Provides the 98% coverage for movies not in our database
 */

import { parseSearchQuery } from './database-search.js';

// Initialize API key lazily to avoid environment variable issues during import
function getTMDBApiKey() {
  return process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Search TMDB for movies using keyword-based search with popularity ranking
 *
 * This function provides comprehensive movie search functionality by:
 * - Using TMDB's native keyword search (no strict title parsing)
 * - Ranking results by TMDB's built-in popularity scores
 * - Handling partial matches (e.g., "baby" finds "Baby Driver")
 * - Supporting multi-word searches (e.g., "dark knight" finds "The Dark Knight")
 *
 * Examples:
 * - searchTMDB("baby") → Returns "Baby Driver", "Rosemary's Baby", etc. by popularity
 * - searchTMDB("avengers") → Returns MCU Avengers movies ranked by popularity
 * - searchTMDB("2001") → Returns "2001: A Space Odyssey" and other 2001-related films
 *
 * @param {string} query - Search terms (keywords, partial titles, etc.)
 * @returns {Promise<Array>} Array of movies sorted by popularity (max 20 results)
 */
export async function searchTMDB(query) {
  // Sanitize input - trim whitespace but preserve all search terms
  const searchQuery = query.trim();

  // Validate query length to prevent empty or too-short searches
  if (!searchQuery || searchQuery.length < 1) {
    console.log('❌ TMDB search skipped: empty query');
    return [];
  }

  console.log(`🎬 Searching TMDB for: "${searchQuery}"`);

  try {
    // Build TMDB search URL using their search/movie endpoint
    // This endpoint handles:
    // - Keyword matching (not just exact titles)
    // - Partial word matching
    // - Multi-word searches
    // - Built-in relevance scoring
    const searchParams = new URLSearchParams({
      api_key: getTMDBApiKey(),
      query: searchQuery,
      include_adult: 'false', // Filter out adult content
      language: 'en-US', // Ensure English results
    });

    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${searchParams}`);

    if (!response.ok) {
      console.error('TMDB search failed:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();

    // Handle empty results gracefully
    if (!data.results || data.results.length === 0) {
      console.log(`❌ TMDB search failed: "${searchQuery}" not found`);
      return [];
    }

    // TMDB returns results with built-in relevance, but we want popularity ranking
    // Sort by popularity (higher = more popular/well-known movies first)
    // This ensures "Baby Driver" appears before obscure "Baby" movies
    const popularityRanked = data.results
      .filter(movie => movie.title && movie.id) // Ensure valid movie data
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    console.log(`✅ TMDB search success: "${searchQuery}" -> ${popularityRanked.length} results`);

    // Limit to top 20 results to prevent overwhelming the UI
    // TMDB typically returns 20 per page anyway
    return popularityRanked.slice(0, 20);
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

/**
 * Get detailed movie information from TMDB by ID
 */
export async function getTMDBMovieDetails(tmdbId) {
  console.log(`🎬 Fetching TMDB details for ID: ${tmdbId}`);

  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${getTMDBApiKey()}`);

    if (!response.ok) {
      console.error('TMDB details fetch failed:', response.status, response.statusText);
      return null;
    }

    const movieData = await response.json();

    console.log(
      `✅ TMDB details fetched: "${movieData.title}" (${movieData.release_date?.substring(0, 4)})`
    );

    return movieData;
  } catch (error) {
    console.error('TMDB details error:', error);
    return null;
  }
}

/**
 * Rank search results by relevance to the original query
 * Prioritizes exact title matches and year matches
 */
export function rankSearchResults(results, originalTitle, originalYear) {
  const scoredResults = results.map(movie => {
    let score = 0;

    // Base score from TMDB popularity
    score += movie.popularity || 0;

    // Exact title match bonus (case insensitive)
    if (movie.title.toLowerCase() === originalTitle.toLowerCase()) {
      score += 1000;
    }

    // Partial title match bonus
    const titleWords = originalTitle.toLowerCase().split(' ');
    const movieTitleLower = movie.title.toLowerCase();
    const matchingWords = titleWords.filter(word => movieTitleLower.includes(word)).length;
    score += (matchingWords / titleWords.length) * 500;

    // Year match bonus
    if (originalYear && movie.release_date) {
      const movieYear = parseInt(movie.release_date.substring(0, 4));
      if (movieYear === originalYear) {
        score += 2000; // Strong bonus for year match
      } else if (Math.abs(movieYear - originalYear) <= 1) {
        score += 500; // Small bonus for close year
      }
    }

    // Penalty for very low popularity (likely incorrect matches)
    if (movie.popularity < 1) {
      score -= 100;
    }

    return {
      ...movie,
      relevanceScore: score,
    };
  });

  // Sort by relevance score (highest first)
  const sortedResults = scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Log ranking for debugging
  console.log(`🏆 TMDB ranking for "${originalTitle}" (${originalYear}):`);
  sortedResults.slice(0, 3).forEach((movie, index) => {
    const year = movie.release_date?.substring(0, 4) || 'Unknown';
    console.log(
      `  ${index + 1}. "${movie.title}" (${year}) - Score: ${movie.relevanceScore.toFixed(1)}`
    );
  });

  // Return top results (limit to 10)
  return sortedResults.slice(0, 10);
}

/**
 * Determine if TMDB search returned a single confident match
 * Used to decide whether to redirect immediately or show search results
 */
export function isSingleConfidentMatch(results, originalTitle, originalYear) {
  if (results.length === 0) {
    return false;
  }

  if (results.length === 1) {
    return results[0].relevanceScore > 1000; // High confidence threshold
  }

  // Multiple results - check if first result is significantly better
  const topResult = results[0];
  const secondResult = results[1];

  // Must have high score AND be significantly better than second result
  const hasHighScore = topResult.relevanceScore > 1500;
  const significantlyBetter = topResult.relevanceScore > secondResult.relevanceScore * 2;

  return hasHighScore && significantlyBetter;
}

/**
 * Search for movies and return categorized results
 * Used by the search route to determine redirect vs results page
 */
export async function searchAndCategorize(query) {
  const results = await searchTMDB(query);
  const { title, year } = parseSearchQuery(query);

  if (results.length === 0) {
    return {
      type: 'no_matches',
      results: [],
      query: query,
    };
  }

  if (isSingleConfidentMatch(results, title, year)) {
    return {
      type: 'single_match',
      results: results,
      movie: results[0],
      query: query,
    };
  }

  return {
    type: 'multiple_matches',
    results: results,
    query: query,
  };
}
