/**
 * GET /api/v1/collections/featured
 *
 * Homepage featured collections with daily rotation
 *
 * Query Parameters:
 * - limit: number of collections to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - moviesPerCollection: number of preview movies (default: 10)
 * - seed: optional seed for deterministic rotation (default: today's date)
 *
 * Response:
 * {
 *   collections: [
 *     {
 *       id: string,
 *       title: string,
 *       totalMovies: number,
 *       categories: string[],
 *       movies: [{ tmdb_id, title, year, poster_url }]
 *     }
 *   ],
 *   count: number
 * }
 */

import { getPool } from '../../../../lib/database';

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
      ORDER BY (
        (bl.quality_score / NULLIF(MAX(bl.quality_score) OVER (), 0)) +
        (('x' || substr(md5(ec.id::text || $1::text), 1, 8))::bit(32)::int::float / 2147483647.0)
      ) DESC
      LIMIT 100
    `;

    const collectionsResult = await pool.query(collectionsQuery, [dailySeed]);

    if (collectionsResult.rows.length === 0) {
      return res.status(200).json({ collections: [], count: 0 });
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

    // OPTIMIZATION: Fetch all movies for all collections in ONE query (eliminate N+1)
    const collectionIds = paginatedCollections.map(c => c.id);

    // Single aggregated query with row numbering per collection
    const allMoviesQuery = `
      WITH collection_movies AS (
        SELECT
          bl.id as collection_id,
          m.tmdb_id,
          m.title,
          m.year,
          m.poster_url,
          ROW_NUMBER() OVER (PARTITION BY bl.id ORDER BY m.tmdb_id) as rn
        FROM browse_lists bl
        CROSS JOIN LATERAL (
          SELECT DISTINCT (mv->>'tmdb_id')::int as tmdb_id
          FROM jsonb_array_elements(bl.editorial_data->'subcategories') sub,
               jsonb_array_elements(sub->'movies') mv
          WHERE (mv->>'tmdb_id') IS NOT NULL
            AND (mv->>'tmdb_id') != 'null'
          LIMIT 50  -- Cap JSONB expansion per collection for safety
        ) AS movie_ids
        JOIN movies m ON m.tmdb_id = movie_ids.tmdb_id
        WHERE bl.id = ANY($1::int[])
          AND m.poster_url IS NOT NULL
          AND m.poster_url != ''
      )
      SELECT collection_id, tmdb_id, title, year, poster_url
      FROM collection_movies
      WHERE rn <= $2
      ORDER BY collection_id, rn
    `;

    // Use a dedicated client with timeout
    const client = await pool.connect();
    try {
      // Set a 10-second timeout for the query
      await client.query('SET statement_timeout = 10000');

      const moviesResult = await client.query(allMoviesQuery, [
        collectionIds,
        parseInt(moviesPerCollection)
      ]);

      // Group movies by collection_id
      const moviesByCollection = {};
      for (const row of moviesResult.rows) {
        if (!moviesByCollection[row.collection_id]) {
          moviesByCollection[row.collection_id] = [];
        }
        moviesByCollection[row.collection_id].push({
          tmdb_id: row.tmdb_id,
          title: row.title,
          year: row.year,
          poster_url: row.poster_url
        });
      }

      // Build the final response with movies attached
      const collectionsWithMovies = paginatedCollections
        .map(collection => ({
          id: collection.id,
          title: collection.title,
          totalMovies: parseInt(collection.movie_count),
          categories: collection.categories || [],
          movies: moviesByCollection[collection.id] || []
        }))
        .filter(c => c.movies.length > 0); // Only include collections with movies

      res.status(200).json({
        collections: collectionsWithMovies,
        count: collectionsWithMovies.length
      });

    } catch (queryError) {
      // Handle timeout or query errors
      console.error('[v1] Query error in featured-collections:', queryError.message);

      // If it's a timeout, try to return partial results
      if (queryError.message.includes('statement timeout') || queryError.message.includes('canceling statement')) {
        // Return empty collections but with metadata
        const fallbackCollections = paginatedCollections.map(collection => ({
          id: collection.id,
          title: collection.title,
          totalMovies: parseInt(collection.movie_count),
          categories: collection.categories || [],
          movies: [] // Empty movies on timeout
        }));

        res.status(200).json({
          collections: fallbackCollections,
          count: fallbackCollections.length,
          warning: 'Some movie data could not be loaded due to timeout'
        });
      } else {
        throw queryError; // Re-throw for outer catch
      }
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[v1] Featured collections API error:', error);
    res.status(500).json({
      error: 'Failed to fetch featured collections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
