/**
 * Contributors Service
 * 
 * Retrieves cast and crew information for movies with person linking
 * Sources: movie_contributors table (preferred) or analysis keyElements (fallback)
 */

import { Pool } from 'pg';

/**
 * Get contributors for a movie with person links
 * @param {string} movieId - Database movie ID (UUID)
 * @param {number} tmdbId - TMDB movie ID (primary identifier)
 * @param {Pool} dbClient - Optional database pool/client to use
 * @returns {Object} Contributors with person links (matches API format)
 */
export async function getMovieContributors(movieId, tmdbId = null, dbClient = null) {
  let client;
  let shouldRelease = false;

  if (dbClient) {
    // Use provided client/pool
    if (typeof dbClient.query === 'function') {
      client = dbClient; // Already a client
    } else {
      client = await dbClient.connect(); // It's a pool
      shouldRelease = true;
    }
  } else {
    // Create a new pool for this request
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    client = await pool.connect();
    shouldRelease = true;
  }

  try {
    // If no tmdbId provided, get it from movie ID
    if (!tmdbId && movieId) {
      const movieResult = await client.query(`
        SELECT tmdb_id FROM movies WHERE id = $1
      `, [movieId]);

      if (movieResult.rows.length > 0) {
        tmdbId = movieResult.rows[0].tmdb_id;
      }
    }

    if (!tmdbId) {
      throw new Error(`No TMDB ID available for contributors lookup (movieId=${movieId}, tmdbId=${tmdbId})`);
    }

    // Simplified query without JOIN to avoid hanging
    // First get contributors without names
    const contributorsResult = await client.query(`
      SELECT
        person_id,
        role
      FROM movie_contributors
      WHERE movie_tmdb_id = $1
      ORDER BY
        CASE role
          WHEN 'director' THEN 1
          WHEN 'writer' THEN 2
          WHEN 'star' THEN 3
          WHEN 'composer' THEN 4
          WHEN 'cinematographer' THEN 5
          ELSE 6
        END
    `, [tmdbId]);

    // Get unique person IDs for batch lookup
    const personIds = [...new Set(contributorsResult.rows.map(row => row.person_id))];

    // Batch lookup person names (this query should be fast)
    // Note: person_id appears to be integer, not UUID
    const personsResult = await client.query(`
      SELECT id, name
      FROM persons
      WHERE id = ANY($1::integer[])
      ORDER BY name ASC
    `, [personIds]);

    if (contributorsResult.rows.length > 0) {
      console.log(`✅ Found ${contributorsResult.rows.length} contributors in movie_contributors table`);
    }

    // Create a map of person_id -> name for fast lookup
    const personNamesMap = {};
    personsResult.rows.forEach(person => {
      personNamesMap[person.id] = person.name;
    });

    // Group contributors by role (matches API format)
    const contributorsByRole = {};
    contributorsResult.rows.forEach(row => {
      const personName = personNamesMap[row.person_id];
      if (!personName) {
        console.warn(`⚠️ No name found for person_id ${row.person_id}`);
        return;
      }

      if (!contributorsByRole[row.role]) {
        contributorsByRole[row.role] = [];
      }

      contributorsByRole[row.role].push({
        personId: row.person_id,
        name: personName,
        slug: `/person/${row.person_id}`,
        tmdbPersonId: null,
        profilePath: null
      });
    });

    // Convert to the format expected by the MovieCreativeFooter component
    return {
      director: contributorsByRole.director?.[0] || null,
      writers: contributorsByRole.writer || [],
      stars: contributorsByRole.star || [],
      cinematographer: contributorsByRole.cinematographer?.[0] || null,
      composer: contributorsByRole.composer?.[0] || null
    };

  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}

// Removed complex fallback logic - contributors service now only uses movie_contributors table

/**
 * Get contributors for multiple movies (batch processing)
 * @param {Array} movieIds - Array of movie IDs
 * @returns {Object} Map of movieId -> contributors
 */
export async function getBatchMovieContributors(movieIds) {
  const results = {};
  
  // Process in chunks to avoid overwhelming the database
  const chunkSize = 10;
  for (let i = 0; i < movieIds.length; i += chunkSize) {
    const chunk = movieIds.slice(i, i + chunkSize);
    
    const promises = chunk.map(async (movieId) => {
      try {
        const contributors = await getMovieContributors(movieId);
        return { movieId, contributors };
      } catch (error) {
        console.error(`❌ Error getting contributors for ${movieId}:`, error.message);
        return { movieId, contributors: null };
      }
    });
    
    const chunkResults = await Promise.all(promises);
    chunkResults.forEach(({ movieId, contributors }) => {
      results[movieId] = contributors;
    });
    
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Search persons by name (for manual linking)
 * @param {string} query - Name to search for
 * @returns {Array} Matching persons
 */
export async function searchPersons(query) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, name
      FROM persons 
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT 10
    `, [`%${query}%`]);
    
    return result.rows.map(person => ({
      personId: person.id,
      name: person.name,
      slug: `/person/${person.id}`,
      tmdbPersonId: null,
      profilePath: null
    }));
    
  } finally {
    client.release();
  }
}