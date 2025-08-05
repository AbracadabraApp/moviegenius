// lib/railway-db.js - Railway PostgreSQL database service
import { Client } from 'pg';

// Railway PostgreSQL connection
const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE CONNECTION ERROR: No database URL found in environment');
    console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set in environment variables');
  }
  
  console.log(`🔗 Connecting to Railway PostgreSQL: ${dbUrl.substring(0, 30)}...`);
  return new Client({
    connectionString: dbUrl
  });
};

// Database helpers - Railway PostgreSQL version
export const RailwayMovieService = {
  // Insert movie with focused fields
  async upsertMovie(movieData) {
    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      const query = `
        INSERT INTO movies (
          tmdb_id, official_title, release_date, title, year, slug, poster_url, streaming_data, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
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
        movieData.poster_url,
        movieData.streaming_data
      ];
      
      const result = await client.query(query, values);
      return { data: result.rows[0], error: null };
      
    } catch (error) {
      console.error('Railway upsertMovie error:', error);
      return { data: null, error };
    } finally {
      await client.end();
    }
  },

  // Get movie by TMDB ID
  async getMovieByTmdbId(tmdbId) {
    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      const query = 'SELECT * FROM movies WHERE tmdb_id = $1';
      const result = await client.query(query, [tmdbId]);
      
      return { 
        data: result.rows.length > 0 ? result.rows[0] : null, 
        error: null 
      };
      
    } catch (error) {
      console.error('Railway getMovieByTmdbId error:', error);
      return { data: null, error };
    } finally {
      await client.end();
    }
  },

  // Get movie analysis by movie ID
  async getMovieAnalysis(movieId) {
    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      const query = 'SELECT * FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1';
      const result = await client.query(query, [movieId]);
      
      return { 
        data: result.rows.length > 0 ? result.rows[0] : null, 
        error: null 
      };
      
    } catch (error) {
      console.error('Railway getMovieAnalysis error:', error);
      return { data: null, error };
    } finally {
      await client.end();
    }
  },

  // Create movie analysis
  async createMovieAnalysis(analysisData) {
    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      const query = `
        INSERT INTO movie_analyses (
          movie_id, query_text, claude_response, analysis_type, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
      `;
      
      const values = [
        analysisData.movie_id,
        analysisData.query_text,
        analysisData.claude_response,
        analysisData.analysis_type || 'general'
      ];
      
      const result = await client.query(query, values);
      return { data: result.rows[0], error: null };
      
    } catch (error) {
      console.error('Railway createMovieAnalysis error:', error);
      return { data: null, error };
    } finally {
      await client.end();
    }
  },

  // Search movies by title and year
  async searchMovies(title, year) {
    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      const query = 'SELECT * FROM movies WHERE title ILIKE $1 AND year = $2';
      const result = await client.query(query, [`%${title}%`, year]);
      
      return { data: result.rows, error: null };
      
    } catch (error) {
      console.error('Railway searchMovies error:', error);
      return { data: [], error };
    } finally {
      await client.end();
    }
  }
};

// Test Railway connection
export async function testRailwayConnection() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) as count FROM movies');
    await client.end();
    return { connected: true, movieCount: result.rows[0].count };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}