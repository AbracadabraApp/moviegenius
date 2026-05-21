// /api/v1/browse-lists - Fetch browse lists by category for iOS Genius tab
// Returns multiple themed lists per category from browse_lists database
//
// Usage: /api/v1/browse-lists?category=Mystery&limit=10
//
// Response format:
// {
//   category: "Mystery",
//   lists: [
//     {
//       id: "uuid",
//       title: "Film Noir Mysteries",
//       totalMovies: 15,
//       movies: [{ tmdb_id, title, year, poster_url }, ...]
//     }
//   ]
// }

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { category, limit = 10, moviesPerList = 10 } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'Category parameter is required' });
  }

  try {
    const client = await pool.connect();

    try {
      // Fetch browse_lists filtered by category
      // Only include lists with editorial_data containing subcategories
      const listsQuery = `
        WITH list_movie_counts AS (
          SELECT
            bl.id,
            COALESCE(bl.revised_title, bl.title) AS title,
            bl.categories,
            bl.editorial_data,
            bl.quality_score,
            bl.created_at,
            COUNT(*) as movie_count
          FROM browse_lists bl,
               jsonb_array_elements(bl.editorial_data->'subcategories') sub,
               jsonb_array_elements(sub->'movies') mv
          WHERE bl.status = 'active'
            AND bl.is_suppressed IS NOT TRUE
            AND $1 = ANY(bl.categories)
            AND bl.editorial_data IS NOT NULL
            AND bl.editorial_data->'subcategories' IS NOT NULL
            AND COALESCE(bl.revised_title, bl.title) NOT LIKE '[%'
            AND COALESCE(bl.revised_title, bl.title) NOT ILIKE '%NEEDS TITLE%'
            AND (mv->>'tmdb_id') IS NOT NULL
            AND (mv->>'tmdb_id') != 'null'
          GROUP BY bl.id, bl.revised_title, bl.title, bl.categories, bl.editorial_data, bl.quality_score, bl.created_at
          HAVING COUNT(*) >= 10
        )
        SELECT id, title, categories, editorial_data, quality_score, movie_count
        FROM list_movie_counts
        ORDER BY quality_score DESC NULLS LAST, created_at DESC
        LIMIT $2
      `;

      const listsResult = await client.query(listsQuery, [category, parseInt(limit)]);

      if (listsResult.rows.length === 0) {
        return res.status(200).json({
          category,
          lists: [],
          message: `No lists found for category: ${category}`
        });
      }

      // OPTIMIZATION: Fetch all movies for all lists in ONE query (eliminate N+1)
      const listIds = listsResult.rows.map(l => l.id);

      // Single aggregated query with row numbering per list
      const allMoviesQuery = `
        WITH list_movies AS (
          SELECT
            bl.id as list_id,
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
            LIMIT 50  -- Cap JSONB expansion per list for safety
          ) AS movie_ids
          JOIN movies m ON m.tmdb_id = movie_ids.tmdb_id
          WHERE bl.id = ANY($1::uuid[])
            AND m.poster_url IS NOT NULL
            AND m.poster_url != ''
        )
        SELECT list_id, tmdb_id, title, year, poster_url
        FROM list_movies
        WHERE rn <= $2
        ORDER BY list_id, rn
      `;

      // Set a timeout for the query
      await client.query('SET statement_timeout = 10000'); // 10 seconds

      let moviesByList = {};
      try {
        const moviesResult = await client.query(allMoviesQuery, [
          listIds,
          parseInt(moviesPerList)
        ]);

        // Group movies by list_id
        for (const row of moviesResult.rows) {
          if (!moviesByList[row.list_id]) {
            moviesByList[row.list_id] = [];
          }
          moviesByList[row.list_id].push({
            tmdb_id: row.tmdb_id,
            title: row.title,
            year: row.year,
            poster_url: row.poster_url
          });
        }
      } catch (queryError) {
        // Handle timeout - return lists without movies
        console.error('[v1/browse-lists] Query timeout or error:', queryError.message);
        if (queryError.message.includes('statement timeout') || queryError.message.includes('canceling statement')) {
          // Continue with empty movies for all lists
          moviesByList = {};
        } else {
          throw queryError; // Re-throw non-timeout errors
        }
      }

      // Build the final response with movies attached
      const listsWithMovies = listsResult.rows
        .map(list => ({
          id: list.id,
          title: list.title,
          totalMovies: parseInt(list.movie_count),
          categories: list.categories || [],
          movies: moviesByList[list.id] || []
        }))
        .filter(list => list.movies.length > 0); // Only include lists with movies

      return res.status(200).json({
        category,
        lists: listsWithMovies,
        count: listsWithMovies.length,
        ...(Object.keys(moviesByList).length === 0 ? { warning: 'Movie data could not be loaded due to timeout' } : {})
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Browse lists API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch browse lists',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
