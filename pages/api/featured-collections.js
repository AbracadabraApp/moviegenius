// API endpoint for homepage featured collections
// Reads from browse_lists.editorial_data (Phase 1 pipeline)
// No dependency on list_movies table
//
// Selection:
// - Only collections with editorial_data containing subcategories + tmdb_ids
// - Minimum 15 movies resolved in editorial_data
// - Daily rotation via date-based MD5 seed
// - Max 25% per category, no sequential category repeats

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 10, offset = 0, moviesPerCollection = 10, seed } = req.query;
  const pool = getPool();

  try {
    const dailySeed = seed ? parseInt(seed) : (
      (() => {
        const today = new Date();
        return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      })()
    );

    // Select collections from editorial_data
    // Count resolved movies (tmdb_id not null) directly from JSONB
    const collectionsQuery = `
      WITH editorial_counts AS (
        SELECT
          bl.id,
          COALESCE(bl.revised_title, bl.title) AS title,
          bl.categories,
          COUNT(*) AS movie_count
        FROM browse_lists bl,
             jsonb_array_elements(bl.editorial_data->'subcategories') sub,
             jsonb_array_elements(sub->'movies') mv
        WHERE bl.status = 'active'
          AND bl.is_suppressed IS NOT TRUE
          AND bl.editorial_data IS NOT NULL
          AND bl.editorial_data->'subcategories' IS NOT NULL
          AND (mv->>'tmdb_id') IS NOT NULL
          AND (mv->>'tmdb_id') != 'null'
          AND COALESCE(bl.revised_title, bl.title) NOT LIKE '[%'
          AND COALESCE(bl.revised_title, bl.title) NOT ILIKE '%NEEDS TITLE%'
        GROUP BY bl.id, bl.revised_title, bl.title, bl.categories
        HAVING COUNT(*) >= 15
      )
      SELECT ec.id, ec.title, ec.categories, ec.movie_count, bl.quality_score
      FROM editorial_counts ec
      JOIN browse_lists bl ON bl.id = ec.id
      ORDER BY (bl.quality_score * 2 + (('x' || substr(md5(ec.id::text || $1::text), 1, 8))::bit(32)::int::float / 2147483647.0)) DESC
      LIMIT 100
    `;

    const collectionsResult = await pool.query(collectionsQuery, [dailySeed]);

    if (collectionsResult.rows.length === 0) {
      return res.status(200).json({ collections: [], message: 'No collections found' });
    }

    // Category balancing
    const requestedLimit = parseInt(limit);
    const requestedOffset = parseInt(offset);
    const totalNeeded = requestedLimit + requestedOffset;
    const maxPerCategory = Math.ceil(totalNeeded * 0.25);

    const selectedCollections = [];
    const categoryCounts = {};
    let lastCategory = null;

    for (const collection of collectionsResult.rows) {
      if (selectedCollections.length >= requestedLimit + requestedOffset) break;

      const primaryCategory = collection.categories && collection.categories.length > 0
        ? collection.categories[0]
        : null;

      if (!primaryCategory) continue;
      if (primaryCategory === lastCategory) continue;

      const currentCount = categoryCounts[primaryCategory] || 0;
      if (currentCount >= maxPerCategory) continue;

      selectedCollections.push(collection);
      categoryCounts[primaryCategory] = currentCount + 1;
      lastCategory = primaryCategory;
    }

    // Relax sequential constraint if needed
    if (selectedCollections.length < requestedLimit + requestedOffset) {
      for (const collection of collectionsResult.rows) {
        if (selectedCollections.length >= requestedLimit + requestedOffset) break;
        if (selectedCollections.find(c => c.id === collection.id)) continue;

        const primaryCategory = collection.categories && collection.categories.length > 0
          ? collection.categories[0]
          : null;

        if (!primaryCategory) continue;

        const currentCount = categoryCounts[primaryCategory] || 0;
        if (currentCount >= maxPerCategory) continue;

        selectedCollections.push(collection);
        categoryCounts[primaryCategory] = currentCount + 1;
      }
    }

    const paginatedCollections = selectedCollections.slice(requestedOffset, requestedOffset + requestedLimit);

    // For each collection, pull preview movies from editorial_data joined to movies for poster_url
    const collectionsWithMovies = await Promise.all(
      paginatedCollections.map(async (collection) => {
        const moviesQuery = `
          SELECT m.tmdb_id, m.title, m.year, m.poster_url
          FROM browse_lists bl,
               jsonb_array_elements(bl.editorial_data->'subcategories') sub,
               jsonb_array_elements(sub->'movies') mv
          JOIN movies m ON m.tmdb_id = (mv->>'tmdb_id')::int
          WHERE bl.id = $1
            AND (mv->>'tmdb_id') IS NOT NULL
            AND (mv->>'tmdb_id') != 'null'
            AND m.poster_url IS NOT NULL
            AND m.poster_url != ''
          LIMIT $2
        `;

        const moviesResult = await pool.query(moviesQuery, [
          collection.id,
          parseInt(moviesPerCollection)
        ]);

        return {
          id: collection.id,
          title: collection.title,
          totalMovies: parseInt(collection.movie_count),
          categories: collection.categories || [],
          movies: moviesResult.rows.map(row => ({
            tmdb_id: row.tmdb_id,
            title: row.title,
            year: row.year,
            poster_url: row.poster_url
          }))
        };
      })
    );

    // Drop any that came back with no movies (shouldn't happen but be safe)
    const withMovies = collectionsWithMovies.filter(c => c.movies.length > 0);

    res.status(200).json({
      collections: withMovies,
      count: withMovies.length
    });

  } catch (error) {
    console.error('Featured collections API error:', error);
    res.status(500).json({
      error: 'Failed to fetch featured collections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
