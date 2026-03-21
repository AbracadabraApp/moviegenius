// API endpoint for homepage featured collections
// Returns curated collections with movie previews
//
// Smart Daily Rotation Algorithm:
// - Minimum 15 movies per collection
// - All movies must have posters
// - Max 25% per category (enforces diversity)
// - No sequential category repeats
// - Daily rotation via date-based seeding

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 10, offset = 0, moviesPerCollection = 10 } = req.query;
  const pool = getPool();

  try {
    // Generate daily seed from current date (YYYYMMDD format)
    const today = new Date();
    const dailySeed = today.getFullYear() * 10000 +
                      (today.getMonth() + 1) * 100 +
                      today.getDate();

    // Fetch quality collections with poster validation
    // Using CTE for poster checking and MD5 for deterministic daily shuffle
    const collectionsQuery = `
      WITH poster_validated AS (
        SELECT
          bl.id,
          bl.title,
          bl.total_movies,
          bl.categories,
          NOT EXISTS (
            SELECT 1
            FROM list_movies lm
            JOIN movies m ON lm.movie_id = m.id
            WHERE lm.list_id = bl.id
              AND (m.poster_url IS NULL OR m.poster_url = '')
          ) as all_posters
        FROM browse_lists bl
        WHERE bl.status = 'active'
          AND bl.total_movies >= 15
      )
      SELECT id, title, total_movies, categories
      FROM poster_validated
      WHERE all_posters = true
      ORDER BY md5(id::text || $1::text)
      LIMIT 100
    `;

    const collectionsResult = await pool.query(collectionsQuery, [dailySeed]);

    if (collectionsResult.rows.length === 0) {
      return res.status(200).json({
        collections: [],
        message: 'No collections found'
      });
    }

    // Apply category balancing with sequential variety
    const requestedLimit = parseInt(limit);
    const requestedOffset = parseInt(offset);
    const maxPerCategory = Math.ceil(requestedLimit * 0.25); // 25% cap

    const selectedCollections = [];
    const categoryCounts = {};
    let lastCategory = null;

    for (const collection of collectionsResult.rows) {
      if (selectedCollections.length >= requestedLimit + requestedOffset) break;

      const primaryCategory = collection.categories && collection.categories.length > 0
        ? collection.categories[0]
        : null;

      // Skip if no category
      if (!primaryCategory) continue;

      // Rule 1: No sequential category repeats
      if (primaryCategory === lastCategory) continue;

      // Rule 2: Category distribution cap (max 25%)
      const currentCount = categoryCounts[primaryCategory] || 0;
      if (currentCount >= maxPerCategory) continue;

      // Accept this collection
      selectedCollections.push(collection);
      categoryCounts[primaryCategory] = currentCount + 1;
      lastCategory = primaryCategory;
    }

    // If we couldn't fill the request with strict rules, relax sequential constraint
    if (selectedCollections.length < requestedLimit + requestedOffset) {
      for (const collection of collectionsResult.rows) {
        if (selectedCollections.length >= requestedLimit + requestedOffset) break;

        // Skip if already selected
        if (selectedCollections.find(c => c.id === collection.id)) continue;

        const primaryCategory = collection.categories && collection.categories.length > 0
          ? collection.categories[0]
          : null;

        if (!primaryCategory) continue;

        // Only enforce category cap in fallback
        const currentCount = categoryCounts[primaryCategory] || 0;
        if (currentCount >= maxPerCategory) continue;

        selectedCollections.push(collection);
        categoryCounts[primaryCategory] = currentCount + 1;
      }
    }

    // Apply pagination offset
    const paginatedCollections = selectedCollections.slice(requestedOffset, requestedOffset + requestedLimit);

    // For each selected collection, get preview movies
    const collectionsWithMovies = await Promise.all(
      paginatedCollections.map(async (collection) => {
        const moviesQuery = `
          SELECT
            m.id,
            m.tmdb_id,
            m.title,
            m.year,
            m.poster_url
          FROM movies m
          JOIN list_movies lm ON m.id = lm.movie_id
          WHERE lm.list_id = $1
          ORDER BY lm.display_order ASC, lm.relevance_score DESC
          LIMIT $2
        `;

        const moviesResult = await pool.query(moviesQuery, [
          collection.id,
          parseInt(moviesPerCollection)
        ]);

        return {
          id: collection.id,
          title: collection.title,
          totalMovies: collection.total_movies,
          categories: collection.categories || [],
          movies: moviesResult.rows.map(row => ({
            id: row.id,
            tmdb_id: row.tmdb_id,
            title: row.title,
            year: row.year,
            poster_url: row.poster_url || '/images/placeholder-poster.jpg'
          }))
        };
      })
    );

    res.status(200).json({
      collections: collectionsWithMovies,
      count: collectionsWithMovies.length
    });

  } catch (error) {
    console.error('Featured collections API error:', error);
    res.status(500).json({
      error: 'Failed to fetch featured collections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
