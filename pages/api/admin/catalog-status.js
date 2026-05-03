// pages/api/admin/catalog-status.js - Monitoring endpoint for catalog health
// GET /api/admin/catalog-status
//
// Returns statistics about catalog freshness and coverage

import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  if (!process.env.RAILWAY_DATABASE_URL && !process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Get catalog statistics
    const stats = await client.query(`
      SELECT
        COUNT(*) as total_movies,
        COUNT(*) FILTER (WHERE slug IS NOT NULL) as movies_with_slug,
        COUNT(*) FILTER (WHERE has_analysis = true) as movies_with_analysis,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as added_last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as added_last_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as added_last_month,
        MAX(created_at) as most_recent_addition,
        MIN(created_at) as oldest_movie
      FROM movies
    `);

    const whyWatchStats = await client.query(`
      SELECT
        COUNT(*) as total_whywatch,
        COUNT(*) FILTER (WHERE recommendation = 'YES') as yes_count,
        COUNT(*) FILTER (WHERE recommendation = 'NO') as no_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as generated_last_24h
      FROM enhanced_why_watch
    `);

    const moreIdeasStats = await client.query(`
      SELECT
        COUNT(*) as total_more_ideas,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as generated_last_24h
      FROM more_ideas
    `);

    // Recent additions
    const recentMovies = await client.query(`
      SELECT tmdb_id, title, year, created_at
      FROM movies
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const catalogStats = stats.rows[0];
    const whyWatch = whyWatchStats.rows[0];
    const moreIdeas = moreIdeasStats.rows[0];

    return res.status(200).json({
      catalog: {
        total_movies: parseInt(catalogStats.total_movies),
        movies_with_slug: parseInt(catalogStats.movies_with_slug),
        movies_with_analysis: parseInt(catalogStats.movies_with_analysis),
        added_last_24h: parseInt(catalogStats.added_last_24h),
        added_last_week: parseInt(catalogStats.added_last_week),
        added_last_month: parseInt(catalogStats.added_last_month),
        most_recent_addition: catalogStats.most_recent_addition,
        oldest_movie: catalogStats.oldest_movie
      },
      enrichment: {
        whywatch: {
          total: parseInt(whyWatch.total_whywatch),
          yes_count: parseInt(whyWatch.yes_count),
          no_count: parseInt(whyWatch.no_count),
          generated_last_24h: parseInt(whyWatch.generated_last_24h)
        },
        more_ideas: {
          total: parseInt(moreIdeas.total_more_ideas),
          generated_last_24h: parseInt(moreIdeas.generated_last_24h)
        }
      },
      recent_additions: recentMovies.rows.map(m => ({
        tmdb_id: m.tmdb_id,
        title: m.title,
        year: m.year,
        created_at: m.created_at
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    return res.status(500).json({
      error: `Database error: ${error.message}`
    });
  } finally {
    await client.end();
  }
}
