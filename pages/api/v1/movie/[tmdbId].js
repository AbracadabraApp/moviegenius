// pages/api/v1/movie/[tmdbId].js - Unified movie data endpoint
// Replaces 4 waterfall API calls with a single query:
// - /api/tmdb-movie (TMDB metadata)
// - /api/movie-data (DB slug + streaming)
// - /api/why-watch (WhyWatch recommendation)
// - /api/movie-contributors-simple (Cast/crew)

import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { tmdbId } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB ID is required' });
  }

  const parsedId = parseInt(tmdbId);
  if (isNaN(parsedId)) {
    return res.status(400).json({ error: 'TMDB ID must be a number' });
  }

  if (!process.env.RAILWAY_DATABASE_URL && !process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Single SQL query with JOINs to fetch all movie data
    const result = await client.query(
      `
      SELECT
        -- Movie metadata
        m.id as movie_uuid,
        m.tmdb_id,
        m.title,
        m.year,
        m.official_title,
        m.release_date,
        m.slug,
        m.poster_url,
        m.trailer_url,
        m.streaming_data,
        m.contributors_json,
        m.has_analysis,
        m.has_linked_analysis,
        m.created_at as movie_created_at,
        m.updated_at as movie_updated_at,

        -- Analysis data
        ma.id as analysis_uuid,
        ma.query_text,
        ma.claude_response,
        ma.analysis_type,
        ma.enhanced_sections,
        ma.enhanced_key_elements,
        ma.enhanced_format,
        ma.has_links,
        ma.link_count,
        ma.created_at as analysis_created_at,

        -- WhyWatch data (v3)
        ew.id as whywatch_uuid,
        ew.recommendation,
        ew.reasons as whywatch_reasons,
        ew.context as whywatch_context,
        ew.model as whywatch_model,
        ew.created_at as whywatch_created_at,

        -- MoreIdeas data
        mi.ideas as more_ideas,
        mi.created_at as more_ideas_created_at

      FROM movies m
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
      LEFT JOIN enhanced_why_watch_v3 ew ON m.tmdb_id = ew.tmdb_id
      LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
      WHERE m.tmdb_id = $1
      LIMIT 1
      `,
      [parsedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Movie not found in database',
        tmdb_id: parsedId
      });
    }

    const row = result.rows[0];

    // Format response for both web and iOS consumption
    const response = {
      // Core movie data
      movie: {
        tmdb_id: row.tmdb_id,
        title: row.title,
        year: row.year,
        official_title: row.official_title,
        release_date: row.release_date,
        slug: row.slug || null,
        poster_url: row.poster_url || null,
        trailer_url: row.trailer_url || null,
        streaming_data: row.streaming_data || null,
        has_analysis: row.has_analysis || false,
        has_linked_analysis: row.has_linked_analysis || false,
        created_at: row.movie_created_at,
        updated_at: row.movie_updated_at
      },

      // Analysis (if exists)
      analysis: row.analysis_uuid ? {
        id: row.analysis_uuid,
        query_text: row.query_text,
        claude_response: row.claude_response,
        analysis_type: row.analysis_type,
        enhanced_sections: row.enhanced_sections || null,
        enhanced_key_elements: row.enhanced_key_elements || null,
        enhanced_format: row.enhanced_format || false,
        has_links: row.has_links || false,
        link_count: row.link_count || 0,
        created_at: row.analysis_created_at
      } : null,

      // WhyWatch (if exists)
      whyWatch: row.whywatch_uuid ? {
        id: row.whywatch_uuid,
        recommendation: row.recommendation,
        reasons: row.whywatch_reasons || [],
        context: row.whywatch_context || null,
        model: row.whywatch_model || null,
        created_at: row.whywatch_created_at
      } : null,

      // MoreIdeas (if exists)
      moreIdeas: row.more_ideas || null,
      moreIdeasCreatedAt: row.more_ideas_created_at || null,

      // Contributors (cast/crew)
      contributors: row.contributors_json || null
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Unified API fetch failed:', error);
    return res.status(500).json({
      error: `Database error: ${error.message}`,
      tmdb_id: parsedId
    });
  } finally {
    await client.end();
  }
}
