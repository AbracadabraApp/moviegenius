/**
 * Contributors Service
 * 
 * Retrieves cast and crew information for movies with person linking
 * Sources: movie_contributors table (preferred) or analysis keyElements (fallback)
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Get contributors for a movie with person links
 * @param {string} movieId - Database movie ID (UUID) 
 * @param {number} tmdbId - TMDB movie ID (primary identifier)
 * @returns {Object} Contributors with person links
 */
export async function getMovieContributors(movieId, tmdbId = null) {
  const client = await pool.connect();
  
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
    
    // Step 1: Try movie_contributors table first (preferred)
    if (tmdbId) {
      const contributorsResult = await client.query(`
        SELECT 
          mc.*,
          p.name as canonical_name
        FROM movie_contributors mc
        LEFT JOIN persons p ON mc.person_id = p.id
        WHERE mc.movie_tmdb_id = $1
      `, [tmdbId]);
      
      if (contributorsResult.rows.length > 0) {
        console.log(`✅ Found ${contributorsResult.rows.length} contributors in movie_contributors table`);
        return formatContributorsFromTable(contributorsResult.rows);
      }
    }
    
    // Step 2: Fallback to analysis keyElements
    console.log('📄 No movie_contributors data, using analysis keyElements fallback');
    const analysisResult = await client.query(`
      SELECT ma.claude_response
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ($1::uuid IS NOT NULL AND m.id = $1) OR ($2 IS NOT NULL AND m.tmdb_id = $2)
      LIMIT 1
    `, [movieId, tmdbId]);
    
    if (analysisResult.rows.length === 0) {
      throw new Error('No analysis data found for movie');
    }
    
    const analysis = JSON.parse(analysisResult.rows[0].claude_response.raw_content);
    const keyElements = analysis.keyElements || {};
    
    // Step 3: Map keyElements names to person IDs
    return await mapKeyElementsToPersons(keyElements, client);
    
  } finally {
    client.release();
  }
}

/**
 * Format contributors from movie_contributors table
 */
function formatContributorsFromTable(contributorRows) {
  const contributors = {
    director: null,
    writers: [],
    stars: [],
    cinematographer: null,
    composer: null,
    producer: null
  };
  
  contributorRows.forEach(row => {
    const person = {
      name: row.canonical_name || row.person_name, // Use canonical name if available
      personId: row.person_id,
      slug: row.person_id ? `/person/${row.person_id}` : null,
      tmdbPersonId: null, // Not available in current persons table
      profilePath: null   // Not available in current persons table
    };
    
    switch (row.role?.toLowerCase()) {
      case 'director':
        contributors.director = person;
        break;
      case 'writer':
      case 'screenplay':
        contributors.writers.push(person);
        break;
      case 'actor':
      case 'star':
        contributors.stars.push(person);
        break;
      case 'cinematographer':
      case 'director of photography':
        contributors.cinematographer = person;
        break;
      case 'composer':
      case 'music':
        contributors.composer = person;
        break;
      case 'producer':
        contributors.producer = person;
        break;
    }
  });
  
  return contributors;
}

/**
 * Map keyElements names to person records
 */
async function mapKeyElementsToPersons(keyElements, client) {
  const contributors = {
    director: null,
    writers: [],
    stars: [],
    cinematographer: null,
    composer: null
  };
  
  // Helper function to find person by name
  async function findPersonByName(name) {
    if (!name || typeof name !== 'string') return null;
    
    const cleanName = name.trim();
    const result = await client.query(`
      SELECT id, name
      FROM persons 
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `, [cleanName]);
    
    if (result.rows.length > 0) {
      const person = result.rows[0];
      return {
        name: person.name,
        personId: person.id,
        slug: `/person/${person.id}`,
        tmdbPersonId: null,
        profilePath: null
      };
    }
    
    // Return name-only if no person record found
    return {
      name: cleanName,
      personId: null,
      slug: null,
      tmdbPersonId: null,
      profilePath: null
    };
  }
  
  // Helper function to split multiple names
  function splitNames(nameString) {
    if (!nameString) return [];
    if (typeof nameString === 'string') {
      return nameString.split(',').map(name => name.trim()).filter(name => name.length > 0);
    }
    if (Array.isArray(nameString)) {
      return nameString.map(name => String(name).trim()).filter(name => name.length > 0);
    }
    return [];
  }
  
  // Map director
  if (keyElements.director) {
    const directorNames = splitNames(keyElements.director);
    if (directorNames.length > 0) {
      contributors.director = await findPersonByName(directorNames[0]);
    }
  }
  
  // Map writers
  if (keyElements.writers) {
    const writerNames = splitNames(keyElements.writers);
    for (const writerName of writerNames.slice(0, 3)) { // Limit to 3 writers
      const person = await findPersonByName(writerName);
      if (person) contributors.writers.push(person);
    }
  }
  
  // Map stars
  if (keyElements.stars) {
    const starNames = splitNames(keyElements.stars);
    for (const starName of starNames.slice(0, 4)) { // Limit to 4 stars
      const person = await findPersonByName(starName);
      if (person) contributors.stars.push(person);
    }
  }
  
  // Map cinematographer
  if (keyElements.cinematographer) {
    const cinematographerNames = splitNames(keyElements.cinematographer);
    if (cinematographerNames.length > 0) {
      contributors.cinematographer = await findPersonByName(cinematographerNames[0]);
    }
  }
  
  // Map composer
  if (keyElements.composer) {
    const composerNames = splitNames(keyElements.composer);
    if (composerNames.length > 0) {
      contributors.composer = await findPersonByName(composerNames[0]);
    }
  }
  
  return contributors;
}

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