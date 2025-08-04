/**
 * Database Search Service
 *
 * Searches our local movie database (2% coverage) for movies
 * before falling back to TMDB search (98% coverage)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client lazily to avoid environment variable issues during import
let supabase = null;
function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Parse search query from EntityLinkedText format
 * Input: "The Dark Knight 2008" or "Casablanca 1942"
 * Output: { title: "The Dark Knight", year: 2008 }
 */
export function parseSearchQuery(query) {
  // Extract year from end of query
  const yearMatch = query.match(/\s(\d{4})$/);

  if (!yearMatch) {
    return { title: query.trim(), year: null };
  }

  const year = parseInt(yearMatch[1]);
  const title = query.replace(/\s\d{4}$/, '').trim();

  return { title, year };
}

/**
 * Search our local database for exact title/year match
 */
export async function searchExactMatch(title, year) {
  try {
    const { data: movie, error } = await getSupabaseClient()
      .from('movies')
      .select('id, title, year, tmdb_id, slug, poster_url')
      .eq('title', title)
      .eq('year', year)
      .single();

    if (error || !movie) {
      return null;
    }

    console.log(`✅ Database exact match: "${title}" (${year}) -> TMDB ${movie.tmdb_id}`);
    return movie;
  } catch (error) {
    console.warn('Database exact match error:', error);
    return null;
  }
}

/**
 * Search our local database with fuzzy matching
 * Handles slight variations in titles
 */
export async function searchFuzzyMatch(title, year) {
  try {
    // Build fuzzy search query
    let query = getSupabaseClient().from('movies').select('id, title, year, tmdb_id, slug, poster_url');

    // If we have a year, filter by it first (most reliable)
    if (year) {
      query = query.eq('year', year);
    }

    // Use ilike for case-insensitive partial matching
    query = query.ilike('title', `%${title}%`);

    const { data: movies, error } = await query.limit(5);

    if (error || !movies || movies.length === 0) {
      return null;
    }

    // Return best match (exact year match preferred)
    const bestMatch = movies.find(m => m.year === year) || movies[0];

    console.log(
      `🔍 Database fuzzy match: "${title}" (${year}) -> "${bestMatch.title}" (${bestMatch.year})`
    );
    return bestMatch;
  } catch (error) {
    console.warn('Database fuzzy match error:', error);
    return null;
  }
}

/**
 * Main database search function
 * Tries exact match first, then fuzzy matching
 */
export async function searchOurDatabase(query) {
  const { title, year } = parseSearchQuery(query);

  console.log(`🔍 Searching database for: "${title}" (${year})`);

  // Try exact match first
  let result = await searchExactMatch(title, year);
  if (result) {
    return result;
  }

  // Fall back to fuzzy matching
  result = await searchFuzzyMatch(title, year);
  if (result) {
    return result;
  }

  console.log(`❌ Database search failed: "${title}" (${year}) not found`);
  return null;
}

/**
 * Check if a movie exists in our database by TMDB ID
 * Used to prevent duplicate creation
 */
export async function movieExistsInDatabase(tmdbId) {
  try {
    const { data: movie, error } = await getSupabaseClient()
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    return error ? null : movie;
  } catch (error) {
    return null;
  }
}

/**
 * Create basic movie entry in database from TMDB data
 * Used when a TMDB movie is discovered via search
 */
export async function createBasicMovieEntry(tmdbMovie) {
  try {
    // Validate tmdbMovie is not null and has required fields
    if (!tmdbMovie || !tmdbMovie.title || !tmdbMovie.id) {
      console.error('Invalid TMDB movie data:', tmdbMovie);
      throw new Error('TMDB movie data is null or missing required fields (title, id)');
    }

    const releaseYear = tmdbMovie.release_date
      ? parseInt(tmdbMovie.release_date.substring(0, 4))
      : null;

    const movieData = {
      title: tmdbMovie.title,
      year: releaseYear,
      tmdb_id: tmdbMovie.id,
      poster_url: tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newMovie, error } = await getSupabaseClient()
      .from('movies')
      .insert(movieData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create movie entry:', error);
      return null;
    }

    console.log(
      `💾 Created database entry: "${tmdbMovie.title}" (${releaseYear}) -> TMDB ${tmdbMovie.id}`
    );
    return newMovie;
  } catch (error) {
    console.error('Error creating movie entry:', error);
    return null;
  }
}
