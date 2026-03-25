/**
 * Genius Recommendations API
 *
 * Given a list of tmdb_ids (seen + saved movies), returns collections
 * ranked by overlap count. Groups results by the seed movie that drove
 * each match so the UI can show "Because you watched X...".
 *
 * POST body: { seenIds: [int], savedIds: [int] }
 * Returns: { sections: [{ seedMovie, collections: [...] }] }
 */

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { seenIds = [], savedIds = [] } = req.body;
  const allIds = [...new Set([...seenIds, ...savedIds])].filter(id => Number.isInteger(id));

  if (allIds.length === 0) {
    return res.status(200).json({ sections: [], empty: true });
  }

  const pool = getPool();

  try {
    // Find collections with highest overlap, along with which seed movies matched
    const result = await pool.query(`
      WITH matches AS (
        SELECT
          bl.id,
          bl.title,
          bl.categories,
          (mv->>'tmdb_id')::int AS matched_tmdb_id,
          COUNT(*) OVER (PARTITION BY bl.id) AS overlap_count
        FROM browse_lists bl,
             jsonb_array_elements(bl.editorial_data->'subcategories') sub,
             jsonb_array_elements(sub->'movies') mv
        WHERE bl.status = 'active'
          AND bl.is_suppressed IS NOT TRUE
          AND bl.editorial_data IS NOT NULL
          AND (mv->>'tmdb_id') IS NOT NULL
          AND (mv->>'tmdb_id') != 'null'
          AND (mv->>'tmdb_id')::int = ANY($1)
      ),
      top_collections AS (
        SELECT DISTINCT id, title, categories, overlap_count
        FROM matches
        ORDER BY overlap_count DESC
        LIMIT 40
      )
      SELECT
        tc.id,
        tc.title,
        tc.categories,
        tc.overlap_count,
        array_agg(DISTINCT m.matched_tmdb_id) AS matched_tmdb_ids
      FROM top_collections tc
      JOIN matches m ON m.id = tc.id
      GROUP BY tc.id, tc.title, tc.categories, tc.overlap_count
      ORDER BY tc.overlap_count DESC
    `, [allIds]);

    if (result.rows.length === 0) {
      return res.status(200).json({ sections: [], empty: true });
    }

    // Fetch seed movie titles for display
    const allMatchedIds = [...new Set(result.rows.flatMap(r => r.matched_tmdb_ids))];
    const moviesResult = await pool.query(
      `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
      [allMatchedIds]
    );
    const movieMap = {};
    for (const m of moviesResult.rows) {
      movieMap[m.tmdb_id] = m;
    }

    // Fetch preview posters for each collection (first 5 matched movies)
    const collectionsWithPosters = await Promise.all(
      result.rows.map(async (row) => {
        const previewMovies = row.matched_tmdb_ids
          .map(id => movieMap[id])
          .filter(Boolean)
          .slice(0, 5);

        return {
          id: row.id,
          title: row.title,
          categories: row.categories || [],
          overlapCount: parseInt(row.overlap_count),
          matchedTmdbIds: row.matched_tmdb_ids,
          previewMovies,
        };
      })
    );

    // Group into sections by primary seed movie
    // Each seed movie gets its own "Because you watched X" section
    // Seen movies take priority over saved movies
    const usedCollectionIds = new Set();
    const sections = [];

    const seedIds = [
      ...seenIds.filter(id => allIds.includes(id)),
      ...savedIds.filter(id => !seenIds.includes(id) && allIds.includes(id)),
    ];

    for (const seedId of seedIds) {
      const seedMovie = movieMap[seedId];
      if (!seedMovie) continue;

      const matching = collectionsWithPosters.filter(
        c => c.matchedTmdbIds.includes(seedId) && !usedCollectionIds.has(c.id)
      ).slice(0, 3);

      if (matching.length === 0) continue;

      matching.forEach(c => usedCollectionIds.add(c.id));

      const isSeen = seenIds.includes(seedId);
      sections.push({
        seedMovie,
        seedType: isSeen ? 'seen' : 'saved',
        collections: matching,
      });

      if (sections.length >= 8) break;
    }

    return res.status(200).json({ sections });

  } catch (error) {
    console.error('Genius recommendations error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}
