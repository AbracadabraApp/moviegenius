/**
 * Enhanced Why Watch API
 * 
 * Provides enhanced Why Watch recommendations for movies
 * Used by static file generation and components
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * GET /api/enhanced-why-watch?tmdbId=550
 * GET /api/enhanced-why-watch?movieId=uuid-123
 * 
 * Returns enhanced Why Watch data for a movie
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId, movieId } = req.query;

  if (!tmdbId && !movieId) {
    return res.status(400).json({ 
      error: 'Missing required parameter: tmdbId or movieId' 
    });
  }

  const client = await pool.connect();

  try {
    let query, params;
    
    if (tmdbId) {
      query = `
        SELECT 
          eww.id,
          eww.recommendation,
          eww.reasons,
          eww.metadata,
          eww.created_at,
          m.title,
          m.year,
          m.tmdb_id
        FROM enhanced_why_watch eww
        JOIN movies m ON eww.movie_id = m.id
        WHERE eww.tmdb_id = $1
      `;
      params = [parseInt(tmdbId)];
    } else {
      query = `
        SELECT 
          eww.id,
          eww.recommendation,
          eww.reasons,
          eww.metadata,
          eww.created_at,
          m.title,
          m.year,
          m.tmdb_id
        FROM enhanced_why_watch eww
        JOIN movies m ON eww.movie_id = m.id
        WHERE eww.movie_id = $1
      `;
      params = [movieId];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Enhanced Why Watch not found for this movie' 
      });
    }

    const whyWatchData = result.rows[0];
    
    // Parse JSON fields
    const reasons = JSON.parse(whyWatchData.reasons);
    const metadata = JSON.parse(whyWatchData.metadata || '{}');

    const response = {
      success: true,
      movie: {
        title: whyWatchData.title,
        year: whyWatchData.year,
        tmdb_id: whyWatchData.tmdb_id
      },
      whyWatch: {
        recommendation: whyWatchData.recommendation,
        reasons: reasons
      },
      metadata: {
        generated_at: whyWatchData.created_at,
        cost: metadata.cost,
        processing_time: metadata.processingTime,
        word_counts: reasons.map(reason => reason.split(' ').length)
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Enhanced Why Watch API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
}

/**
 * Batch endpoint for static file generation
 * GET /api/enhanced-why-watch?batch=true&limit=100&offset=0
 */
export async function getBatchWhyWatch(limit = 100, offset = 0) {
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        eww.movie_id,
        eww.tmdb_id,
        eww.recommendation,
        eww.reasons,
        m.title,
        m.year
      FROM enhanced_why_watch eww
      JOIN movies m ON eww.movie_id = m.id
      ORDER BY eww.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await client.query(query, [limit, offset]);

    return result.rows.map(row => ({
      movie_id: row.movie_id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      whyWatch: {
        recommendation: row.recommendation,
        reasons: JSON.parse(row.reasons)
      }
    }));

  } finally {
    client.release();
  }
}