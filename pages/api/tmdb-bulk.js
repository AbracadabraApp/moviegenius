// pages/api/tmdb-bulk.js - TMDB Bulk Fetching API with Rate Limiting and Error Handling
import { createClient, supabase } from '../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 40, // TMDB allows 40 requests per 10 seconds
  window: 10000, // 10 seconds in milliseconds
  maxConcurrent: 8, // Maximum concurrent requests
  retryDelay: 1000, // Initial retry delay in ms
  maxRetries: 3,
};

// In-memory rate limiting tracker
let requestQueue = [];
let activeRequests = 0;
let lastWindowStart = Date.now();
let requestsInWindow = 0;

/**
 * Rate limiting queue manager
 */
class RateLimitManager {
  static async waitForSlot() {
    const now = Date.now();

    // Reset window if expired
    if (now - lastWindowStart >= RATE_LIMIT.window) {
      lastWindowStart = now;
      requestsInWindow = 0;
    }

    // Wait if we've hit the rate limit
    if (requestsInWindow >= RATE_LIMIT.requests) {
      const waitTime = RATE_LIMIT.window - (now - lastWindowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursive call after waiting
      }
    }

    // Wait if too many concurrent requests
    if (activeRequests >= RATE_LIMIT.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.waitForSlot(); // Recursive call
    }

    // Reserve the slot
    requestsInWindow++;
    activeRequests++;
  }

  static releaseSlot() {
    activeRequests = Math.max(0, activeRequests - 1);
  }
}

/**
 * Make a rate-limited TMDB API request with retries
 */
async function rateLimitedTMDBRequest(url, retryCount = 0) {
  await RateLimitManager.waitForSlot();

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000, // 8 second timeout
    });

    RateLimitManager.releaseSlot();

    // Handle rate limit response (429)
    if (response.status === 429) {
      if (retryCount < RATE_LIMIT.maxRetries) {
        const retryDelay = RATE_LIMIT.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`TMDB rate limited, retrying in ${retryDelay}ms (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return rateLimitedTMDBRequest(url, retryCount + 1);
      } else {
        throw new Error(`Rate limit exceeded after ${RATE_LIMIT.maxRetries} retries`);
      }
    }

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    RateLimitManager.releaseSlot();

    // Retry on network errors
    if (
      retryCount < RATE_LIMIT.maxRetries &&
      (error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network'))
    ) {
      const retryDelay = RATE_LIMIT.retryDelay * Math.pow(2, retryCount);
      console.warn(`TMDB network error, retrying in ${retryDelay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return rateLimitedTMDBRequest(url, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Process a single TMDB request based on type
 */
async function processTMDBRequest(request) {
  const { type, params, id } = request;

  try {
    let url;
    let data;

    switch (type) {
      case 'search_movie':
        url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(params.title)}&year=${params.year}`;
        data = await rateLimitedTMDBRequest(url);

        // Return first result with enhanced data
        const movie = data.results?.[0];
        if (movie) {
          return {
            id,
            type,
            success: true,
            data: {
              tmdb_id: movie.id,
              title: movie.title,
              year: new Date(movie.release_date).getFullYear(),
              poster: movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null,
              overview: movie.overview,
              vote_average: movie.vote_average,
              vote_count: movie.vote_count,
              popularity: movie.popularity,
              release_date: movie.release_date,
            },
          };
        } else {
          return {
            id,
            type,
            success: false,
            error: 'Movie not found in TMDB',
          };
        }

      case 'movie_details':
        url = `${TMDB_BASE_URL}/movie/${params.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=credits,watch/providers`;
        data = await rateLimitedTMDBRequest(url);

        return {
          id,
          type,
          success: true,
          data: {
            tmdb_id: data.id,
            title: data.title,
            year: new Date(data.release_date).getFullYear(),
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            backdrop: data.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
              : null,
            overview: data.overview,
            runtime: data.runtime,
            genres: data.genres,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            popularity: data.popularity,
            release_date: data.release_date,
            credits: data.credits,
            watch_providers: data['watch/providers']?.results?.US,
          },
        };

      case 'movie_credits':
        url = `${TMDB_BASE_URL}/movie/${params.tmdb_id}/credits?api_key=${TMDB_API_KEY}`;
        data = await rateLimitedTMDBRequest(url);

        return {
          id,
          type,
          success: true,
          data: {
            tmdb_id: params.tmdb_id,
            cast: data.cast?.slice(0, 20), // Limit to top 20 cast members
            crew: data.crew?.filter(person =>
              ['Director', 'Producer', 'Executive Producer', 'Screenplay', 'Writer'].includes(
                person.job
              )
            ),
          },
        };

      case 'movie_streaming':
        url = `${TMDB_BASE_URL}/movie/${params.tmdb_id}/watch/providers?api_key=${TMDB_API_KEY}`;
        data = await rateLimitedTMDBRequest(url);

        const usProviders = data.results?.US;
        let streamingText = '';

        if (usProviders?.flatrate?.length > 0) {
          const services = usProviders.flatrate.map(provider => provider.provider_name);
          streamingText = services.slice(0, 3).join(', '); // Limit to 3 services
        } else if (usProviders?.ads?.length > 0) {
          const services = usProviders.ads.map(provider => provider.provider_name);
          streamingText = services.slice(0, 3).join(', ') + ' (with ads)';
        } else {
          streamingText = 'TBD';
        }

        return {
          id,
          type,
          success: true,
          data: {
            tmdb_id: params.tmdb_id,
            streamingText,
            providers: usProviders,
          },
        };

      case 'person_details':
        url = `${TMDB_BASE_URL}/person/${params.person_id}?api_key=${TMDB_API_KEY}&append_to_response=movie_credits`;
        data = await rateLimitedTMDBRequest(url);

        return {
          id,
          type,
          success: true,
          data: {
            person_id: data.id,
            name: data.name,
            biography: data.biography,
            birthday: data.birthday,
            deathday: data.deathday,
            place_of_birth: data.place_of_birth,
            profile_path: data.profile_path
              ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
              : null,
            known_for_department: data.known_for_department,
            movie_credits: data.movie_credits,
          },
        };

      default:
        return {
          id,
          type,
          success: false,
          error: `Unknown request type: ${type}`,
        };
    }
  } catch (error) {
    console.error(`TMDB bulk request failed for ${type}:`, error);
    return {
      id,
      type,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cache results in Supabase for frequently requested data
 */
async function cacheResults(results) {
  try {
    const pool = getPool();

    const cachePromises = results
      .filter(result => result.success && result.type === 'movie_details')
      .map(async result => {
        const movieData = result;

        // 🔒 CRITICAL FIX: Check if movie already exists to preserve Claude slugs
        // DO NOT overwrite existing Claude-generated slugs with TMDB overview text
        const { data: existingMovie } = await supabase
          .from('movies')
          .select('slug, created_at')
          .eq('tmdb_id', movieData.tmdb_id)
          .single();

        // Prepare upsert data - preserve existing slug if it's a good Claude slug
        const upsertData = {
          tmdb_id: movieData.tmdb_id,
          title: movieData.title,
          year: movieData.year,
          poster_url: movieData.poster,
          streaming_data: null, // Will be filled by streaming request
          updated_at: new Date().toISOString(),
        };

        // Only set slug for new movies - never store TMDB overview text
        if (!existingMovie) {
          // New movie - set created_at but leave slug null for Claude generation
          upsertData.created_at = new Date().toISOString();
          upsertData.slug = null; // Wait for Claude to generate proper slug
        } else if (
          existingMovie.slug &&
          (existingMovie.slug.includes('directed by') ||
            existingMovie.slug.includes('starring') ||
            existingMovie.slug.includes('follows') ||
            existingMovie.slug.includes('tells the story') ||
            existingMovie.slug.includes('Plot:') ||
            existingMovie.slug.includes('Overview:') ||
            existingMovie.slug.includes('Synopsis:') ||
            existingMovie.slug.length > 200)
        ) {
          // Clear bad TMDB-style slug - wait for Claude generation
          upsertData.slug = null;
        }
        // If existing movie has a good Claude slug, preserve it (don't set slug field)

        const { error } = await supabase.from('movies').upsert(upsertData, {
          onConflict: 'tmdb_id',
          ignoreDuplicates: false,
        });

        if (error) {
          console.warn('Failed to cache movie data:', error);
        }
      });

    await Promise.allSettled(cachePromises);
  } catch (error) {
    console.warn('Failed to cache TMDB results:', error);
    // Don't fail the request if caching fails
  }
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { requests } = req.body;

    // Validation
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        error: 'Invalid request format. Expected array of requests.',
      });
    }

    if (requests.length === 0) {
      return res.status(400).json({
        error: 'No requests provided',
      });
    }

    if (requests.length > 50) {
      return res.status(400).json({
        error: 'Too many requests. Maximum 50 requests per batch.',
      });
    }

    // Validate each request
    for (const request of requests) {
      if (!request.type || !request.id) {
        return res.status(400).json({
          error: 'Each request must have type and id fields',
        });
      }
    }

    console.log(`🎬 Processing ${requests.length} TMDB bulk requests`);

    // Process all requests in parallel with Promise.allSettled
    const results = await Promise.allSettled(requests.map(request => processTMDBRequest(request)));

    // Transform Promise.allSettled results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Request ${index} failed:`, result.reason);
        return {
          id: requests[index].id,
          type: requests[index].type,
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    // Cache successful results (fire and forget)
    cacheResults(processedResults).catch(error =>
      console.warn('Background caching failed:', error)
    );

    const successCount = processedResults.filter(r => r.success).length;
    const failureCount = processedResults.filter(r => !r.success).length;
    const processingTime = Date.now() - startTime;

    console.log(
      `✅ TMDB bulk completed: ${successCount} success, ${failureCount} failures in ${processingTime}ms`
    );

    res.status(200).json({
      results: processedResults,
      summary: {
        total: requests.length,
        successful: successCount,
        failed: failureCount,
        processingTime,
      },
    });
  } catch (error) {
    console.error('TMDB bulk API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Helper function to create bulk requests
 */
export function createBulkRequests() {
  return {
    searchMovie: (id, title, year) => ({
      id,
      type: 'search_movie',
      params: { title, year },
    }),

    movieDetails: (id, tmdbId) => ({
      id,
      type: 'movie_details',
      params: { tmdb_id: tmdbId },
    }),

    movieCredits: (id, tmdbId) => ({
      id,
      type: 'movie_credits',
      params: { tmdb_id: tmdbId },
    }),

    movieStreaming: (id, tmdbId) => ({
      id,
      type: 'movie_streaming',
      params: { tmdb_id: tmdbId },
    }),

    personDetails: (id, personId) => ({
      id,
      type: 'person_details',
      params: { person_id: personId },
    }),
  };
}

/**
 * Usage example for other APIs:
 *
 * import { createBulkRequests } from './tmdb-bulk';
 *
 * const bulkHelper = createBulkRequests();
 * const requests = [
 *   bulkHelper.searchMovie('movie1', 'The Matrix', 1999),
 *   bulkHelper.movieDetails('movie2', 603),
 *   bulkHelper.movieStreaming('movie3', 603)
 * ];
 *
 * const response = await fetch('/api/tmdb-bulk', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ requests })
 * });
 */
