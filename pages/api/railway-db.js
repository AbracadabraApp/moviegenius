// lib/railway-db.js - Universal Railway PostgreSQL Database Client
// Replaces lib/supabase.js with Railway PostgreSQL exclusively
// Works in server context (API routes, scripts, SSR) - browser context uses API endpoints

import { Client, Pool } from 'pg';

// Environment detection
const isNode = typeof window === 'undefined';
const isBrowser = typeof window !== 'undefined';

// Database connection management
let globalPool = null;

// Railway PostgreSQL connection configuration - Optimized to prevent deadlocks
function getRailwayConfig() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    const error = 'RAILWAY_DATABASE_URL or DATABASE_URL must be set in environment variables';
    console.error('❌ Database Connection Error:', error);
    throw new Error(error);
  }
  
  return {
    connectionString: dbUrl,
    ssl: false, // Railway PostgreSQL doesn't require SSL in this configuration
    
    // 🚨 DEADLOCK PREVENTION: Optimized pool settings
    max: 10, // Reduced from 20 to prevent connection exhaustion
    min: 2,  // Keep minimum connections alive
    acquireTimeoutMillis: 1000, // Shorter timeout to fail fast
    idleTimeoutMillis: 10000,   // Shorter idle timeout
    connectionTimeoutMillis: 3000, // Slightly longer connection timeout
    
    // 🛡️ STABILITY SETTINGS
    allowExitOnIdle: false, // Keep pool alive
    statement_timeout: 5000, // 5 second query timeout
    query_timeout: 5000,     // 5 second query timeout
    application_name: 'moviegenius-api', // For monitoring
  };
}

// Get shared connection pool for optimal performance
function getPool() {
  if (isBrowser) {
    throw new Error('Direct database access not available in browser context - use API endpoints');
  }
  
  if (!globalPool) {
    try {
      globalPool = new Pool(getRailwayConfig());
      console.log('✅ Railway PostgreSQL pool created');
    } catch (error) {
      console.error('❌ Failed to create Railway PostgreSQL pool:', error.message);
      throw error;
    }
  }
  
  return globalPool;
}

// Get single database client (for scripts and one-off operations)
function getRailwayClient() {
  if (isBrowser) {
    throw new Error('Direct database access not available in browser context - use API endpoints');
  }
  
  return new Client(getRailwayConfig());
}

// Close the global pool (for cleanup)
async function closePool() {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
    console.log('✅ Railway PostgreSQL pool closed');
  }
}

// Database Services - Mirror the structure from lib/supabase.js but using Railway PostgreSQL
export const MovieService = {
  // Insert or update movie with focused fields
  async upsertMovie(movieData, client = null) {
    const pool = getPool();
    const dbClient = client || await pool.connect();
    const shouldRelease = !client; // Only release if we created the connection
    
    try {
      const query = `
        INSERT INTO movies (
          tmdb_id, official_title, release_date, title, year, slug, 
          poster_url, streaming_data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW()
        )
        ON CONFLICT (tmdb_id) 
        DO UPDATE SET 
          official_title = EXCLUDED.official_title,
          release_date = EXCLUDED.release_date,
          title = EXCLUDED.title,
          year = EXCLUDED.year,
          slug = EXCLUDED.slug,
          poster_url = EXCLUDED.poster_url,
          streaming_data = EXCLUDED.streaming_data,
          updated_at = NOW()
        RETURNING *;
      `;
      
      const values = [
        movieData.tmdb_id,
        movieData.official_title,
        movieData.release_date,
        movieData.title,
        movieData.year,
        movieData.slug,
        movieData.streaming_data ? JSON.stringify(movieData.streaming_data) : null,
        movieData.poster_url
      ];
      
      const result = await dbClient.query(query, values);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ MovieService.upsertMovie error:', error.message);
      throw error;
    } finally {
      if (shouldRelease) {
        dbClient.release();
      }
    }
  },

  // Get movie by title and year
  async getMovie(title, year, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = 'SELECT * FROM movies WHERE title = $1 AND year = $2 LIMIT 1';
      const result = await dbClient.query(query, [title, year]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get movie by TMDB ID (most efficient lookup)
  async getMovieByTMDBId(tmdbId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = 'SELECT * FROM movies WHERE tmdb_id = $1 LIMIT 1';
      const result = await dbClient.query(query, [parseInt(tmdbId)]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Search movies
  async searchMovies(query, limit = 20, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const searchQuery = `
        SELECT * FROM movies 
        WHERE title ILIKE $1 OR official_title ILIKE $1 OR slug ILIKE $1
        ORDER BY title
        LIMIT $2
      `;
      const result = await dbClient.query(searchQuery, [`%${query}%`, limit]);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get all movies (for admin/stats)
  async getAllMovies(limit = null, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = limit 
        ? 'SELECT * FROM movies ORDER BY created_at DESC LIMIT $1'
        : 'SELECT * FROM movies ORDER BY created_at DESC';
      
      const result = limit 
        ? await dbClient.query(query, [limit])
        : await dbClient.query(query);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get movies with TMDB data (premium movies)
  async getMoviesWithTMDB(client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM movies 
        WHERE tmdb_id IS NOT NULL 
        ORDER BY title
      `;
      const result = await dbClient.query(query);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get movie analysis
  async getMovieAnalysis(movieId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM movie_analyses 
        WHERE movie_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const result = await dbClient.query(query, [movieId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Store movie analysis (with optional processed_content for links)
  async upsertMovieAnalysis(movieId, analysisData, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();

    try {
      const query = `
        INSERT INTO movie_analyses (
          movie_id, claude_response, has_links, linked_at, link_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW(), NOW()
        )
        ON CONFLICT (movie_id)
        DO UPDATE SET
          claude_response = EXCLUDED.claude_response,
          has_links = EXCLUDED.has_links,
          linked_at = EXCLUDED.linked_at,
          link_count = EXCLUDED.link_count,
          updated_at = NOW()
        RETURNING *;
      `;

      const claudeResponseData = typeof analysisData === 'string'
        ? analysisData
        : JSON.stringify(analysisData);

      // Extract link metadata from analysisData if it's an object
      const hasLinks = typeof analysisData === 'object' ? analysisData.has_links || false : false;
      const linkedAt = typeof analysisData === 'object' ? analysisData.linked_at : null;
      const linkCount = typeof analysisData === 'object' ? analysisData.link_count || 0 : 0;

      const result = await dbClient.query(query, [
        movieId,
        claudeResponseData,
        hasLinks,
        linkedAt,
        linkCount
      ]);
      return result.rows[0];

    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },
};

export const EpisodeService = {
  // Get episode by theme, series, and episode ID
  async getEpisode(themeId, seriesId, episodeId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM episodes 
        WHERE theme_id = $1 AND series_id = $2 AND episode_id = $3 
        LIMIT 1
      `;
      const result = await dbClient.query(query, [themeId, seriesId, episodeId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Insert or update episode content
  async upsertEpisode(episodeData, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        INSERT INTO episodes (
          theme_id, series_id, episode_id, title, subtitle, content, 
          hero_image, generated_at, version, locked, locked_at, locked_by,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        )
        ON CONFLICT (theme_id, series_id, episode_id) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          content = EXCLUDED.content,
          hero_image = EXCLUDED.hero_image,
          generated_at = EXCLUDED.generated_at,
          version = EXCLUDED.version,
          locked = EXCLUDED.locked,
          locked_at = EXCLUDED.locked_at,
          locked_by = EXCLUDED.locked_by,
          updated_at = NOW()
        RETURNING *;
      `;
      
      const values = [
        episodeData.theme_id,
        episodeData.series_id,
        episodeData.episode_id,
        episodeData.title,
        episodeData.subtitle,
        episodeData.content,
        episodeData.hero_image,
        episodeData.generated_at,
        episodeData.version,
        episodeData.locked || false,
        episodeData.locked_at,
        episodeData.locked_by
      ];
      
      const result = await dbClient.query(query, values);
      return result.rows[0];
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get all episodes for a theme
  async getEpisodesByTheme(themeId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM episodes 
        WHERE theme_id = $1 
        ORDER BY series_id ASC, episode_id ASC
      `;
      const result = await dbClient.query(query, [themeId]);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get all episodes for a series
  async getEpisodesBySeries(themeId, seriesId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM episodes 
        WHERE theme_id = $1 AND series_id = $2 
        ORDER BY episode_id ASC
      `;
      const result = await dbClient.query(query, [themeId, seriesId]);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Search episodes by content
  async searchEpisodes(query, limit = 20, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const searchQuery = `
        SELECT * FROM episodes 
        WHERE title ILIKE $1 OR subtitle ILIKE $1
        ORDER BY theme_id ASC, series_id ASC, episode_id ASC
        LIMIT $2
      `;
      const result = await dbClient.query(searchQuery, [`%${query}%`, limit]);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Get all episodes (for admin/stats)
  async getAllEpisodes(client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM episodes 
        ORDER BY theme_id ASC, series_id ASC, episode_id ASC
      `;
      const result = await dbClient.query(query);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Lock episode to prevent regeneration
  async lockEpisode(themeId, seriesId, episodeId, lockedBy = 'system', client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        UPDATE episodes 
        SET locked = true, locked_at = NOW(), locked_by = $4, updated_at = NOW()
        WHERE theme_id = $1 AND series_id = $2 AND episode_id = $3
        RETURNING *;
      `;
      const result = await dbClient.query(query, [themeId, seriesId, episodeId, lockedBy]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Unlock episode
  async unlockEpisode(themeId, seriesId, episodeId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        UPDATE episodes 
        SET locked = false, locked_at = NULL, locked_by = NULL, updated_at = NOW()
        WHERE theme_id = $1 AND series_id = $2 AND episode_id = $3
        RETURNING *;
      `;
      const result = await dbClient.query(query, [themeId, seriesId, episodeId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Check if episode is locked
  async isEpisodeLocked(themeId, seriesId, episodeId, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT locked, locked_at, locked_by 
        FROM episodes 
        WHERE theme_id = $1 AND series_id = $2 AND episode_id = $3
      `;
      const result = await dbClient.query(query, [themeId, seriesId, episodeId]);
      
      return result.rows.length > 0 ? result.rows[0].locked : false;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },
};

export const CacheService = {
  // Get cached response
  async getCache(queryHash, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        SELECT * FROM query_cache 
        WHERE query_hash = $1 AND expires_at > NOW()
        LIMIT 1
      `;
      const result = await dbClient.query(query, [queryHash]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Set cache
  async setCache(queryHash, queryText, responseData, cacheType, expiresAt, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = `
        INSERT INTO query_cache (
          query_hash, query_text, response_data, cache_type, expires_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW()
        )
        ON CONFLICT (query_hash) 
        DO UPDATE SET 
          query_text = EXCLUDED.query_text,
          response_data = EXCLUDED.response_data,
          cache_type = EXCLUDED.cache_type,
          expires_at = EXCLUDED.expires_at
        RETURNING *;
      `;
      
      const responseDataJson = typeof responseData === 'string' 
        ? responseData 
        : JSON.stringify(responseData);
      
      const result = await dbClient.query(query, [
        queryHash, 
        queryText, 
        responseDataJson, 
        cacheType, 
        expiresAt
      ]);
      
      return result.rows[0];
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Clear expired cache
  async clearExpiredCache(client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const query = 'DELETE FROM query_cache WHERE expires_at < NOW()';
      const result = await dbClient.query(query);
      
      return result.rowCount;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },
};

// Person Service for contributor linking
export const PersonService = {
  // Get person by name for linking
  async getPersonByName(name, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      // Try exact match first
      let query = 'SELECT id, name FROM persons WHERE name = $1 LIMIT 1';
      let result = await dbClient.query(query, [name]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Try case-insensitive match
      query = 'SELECT id, name FROM persons WHERE LOWER(name) = LOWER($1) LIMIT 1';
      result = await dbClient.query(query, [name]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },

  // Search persons
  async searchPersons(query, limit = 20, client = null) {
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();
    
    try {
      const searchQuery = `
        SELECT id, name FROM persons 
        WHERE name ILIKE $1
        ORDER BY name
        LIMIT $2
      `;
      const result = await dbClient.query(searchQuery, [`%${query}%`, limit]);
      
      return result.rows;
      
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  },
};

// Direct database access helpers
export {
  getRailwayClient,
  getPool,
  closePool,
  isNode,
  isBrowser,
};

// Default export for backward compatibility
const railwayDb = {
  MovieService,
  EpisodeService,
  CacheService,
  PersonService,
  getRailwayClient,
  getPool,
  closePool,
};

export default railwayDb;