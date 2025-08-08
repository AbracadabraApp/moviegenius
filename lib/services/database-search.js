/**
 * Database Search Service
 *
 * Searches our local movie database (2% coverage) for movies
 * before falling back to TMDB search (98% coverage)
 */

import { getPool } from '../railway-db.js';

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
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, title, year, tmdb_id, slug, poster_url FROM movies WHERE title = $1 AND year = $2',
      [title, year]
    );

    const movie = result.rows.length > 0 ? result.rows[0] : null;

    if (!movie) {
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
    const pool = getPool();
    
    // Build fuzzy search query
    let queryText = `
      SELECT id, title, year, tmdb_id, slug, poster_url 
      FROM movies 
      WHERE title ILIKE $1
    `;
    let params = [`%${title}%`];

    // If we have a year, filter by it first (most reliable)
    if (year) {
      queryText += ` AND year = $2`;
      params.push(year);
    }

    queryText += ` ORDER BY title LIMIT 5`;

    const result = await pool.query(queryText, params);
    const movies = result.rows;

    if (!movies || movies.length === 0) {
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
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, title, year, tmdb_id FROM movies WHERE tmdb_id = $1',
      [tmdbId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
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

    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO movies (title, year, tmdb_id, poster_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [
      tmdbMovie.title,
      releaseYear,
      tmdbMovie.id,
      tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null
    ]);

    const newMovie = result.rows.length > 0 ? result.rows[0] : null;

    if (!newMovie) {
      console.error('Failed to create movie entry: No data returned');
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
