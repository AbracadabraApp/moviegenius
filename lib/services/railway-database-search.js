/**
 * Railway Database Search Service
 *
 * Railway PostgreSQL compatible version of database search functions
 * Used for movie discovery and creation in the analysis API
 */

import { Client } from 'pg';

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

/**
 * Check if a movie exists in Railway database by TMDB ID
 * Used to prevent duplicate creation
 */
export async function movieExistsInRailwayDatabase(tmdbId) {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT id, title, year, tmdb_id FROM movies WHERE tmdb_id = $1',
      [tmdbId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error checking movie existence:', error);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * Create basic movie entry in Railway database from TMDB data
 * Used when a TMDB movie is discovered via search
 */
export async function createBasicMovieEntryRailway(tmdbMovie) {
  const client = getRailwayClient();
  
  try {
    // Validate tmdbMovie is not null and has required fields
    if (!tmdbMovie || !tmdbMovie.title || !tmdbMovie.id) {
      console.error('Invalid TMDB movie data:', tmdbMovie);
      throw new Error('TMDB movie data is null or missing required fields (title, id)');
    }

    await client.connect();

    // Check if movie already exists to prevent duplicates
    const existingMovie = await client.query(
      'SELECT id, title, year, tmdb_id FROM movies WHERE tmdb_id = $1',
      [tmdbMovie.id]
    );

    if (existingMovie.rows.length > 0) {
      console.log(`✅ Movie already exists: "${tmdbMovie.title}" (TMDB ${tmdbMovie.id})`);
      return existingMovie.rows[0];
    }

    const releaseYear = tmdbMovie.release_date
      ? parseInt(tmdbMovie.release_date.substring(0, 4))
      : null;

    const posterUrl = tmdbMovie.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : null;

    const insertQuery = `
      INSERT INTO movies (title, year, tmdb_id, poster_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      tmdbMovie.title,
      releaseYear,
      tmdbMovie.id,
      posterUrl
    ]);

    if (result.rows.length > 0) {
      const newMovie = result.rows[0];
      console.log(
        `💾 Created Railway database entry: "${tmdbMovie.title}" (${releaseYear}) -> TMDB ${tmdbMovie.id}`
      );
      return newMovie;
    } else {
      throw new Error('Failed to insert movie into database');
    }

  } catch (error) {
    // Check if it's a duplicate key error
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      console.log(`⚠️ Movie "${tmdbMovie.title}" already exists (duplicate key), fetching existing record`);
      
      const existingResult = await client.query(
        'SELECT id, title, year, tmdb_id FROM movies WHERE tmdb_id = $1',
        [tmdbMovie.id]
      );
      
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0];
      }
    }

    console.error('Error creating movie entry:', error);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * Search Railway database for exact title/year match
 */
export async function searchExactMatchRailway(title, year) {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    let query = 'SELECT id, title, year, tmdb_id, poster_url FROM movies WHERE title = $1';
    let params = [title];
    
    if (year) {
      query += ' AND year = $2';
      params.push(year);
    }
    
    query += ' LIMIT 1';
    
    const result = await client.query(query, params);
    
    if (result.rows.length > 0) {
      console.log(`✅ Railway exact match: "${title}" (${year}) -> TMDB ${result.rows[0].tmdb_id}`);
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.warn('Railway exact match error:', error);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * Search Railway database with fuzzy matching
 */
export async function searchFuzzyMatchRailway(title, year) {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    let query = 'SELECT id, title, year, tmdb_id, poster_url FROM movies WHERE title ILIKE $1';
    let params = [`%${title}%`];
    
    if (year) {
      query += ' AND year = $2';
      params.push(year);
    }
    
    query += ' ORDER BY year DESC LIMIT 5';
    
    const result = await client.query(query, params);
    
    if (result.rows.length > 0) {
      // Return best match (exact year match preferred)
      const bestMatch = result.rows.find(m => m.year === year) || result.rows[0];
      
      console.log(
        `🔍 Railway fuzzy match: "${title}" (${year}) -> "${bestMatch.title}" (${bestMatch.year})`
      );
      return bestMatch;
    }
    
    return null;
  } catch (error) {
    console.warn('Railway fuzzy match error:', error);
    return null;
  } finally {
    await client.end();
  }
}