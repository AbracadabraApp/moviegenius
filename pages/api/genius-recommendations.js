/**
 * Genius Recommendations API
 *
 * Given a list of tmdb_ids (seen + saved movies), returns collections
 * ranked by overlap count (how many of the user's movies appear in each).
 *
 * Each collection includes:
 *   - overlapCount: how many user movies matched
 *   - matchedMovies: the actual overlapping movies (for display)
 *   - previewMovies: 4 representative movies sampled from the full collection
 *
 * POST body: { seenIds: [int], savedIds: [int] }
 * Returns: { collections: [{ id, title, categories, overlapCount, matchedMovies, previewMovies }] }
 */

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { seenIds = [], savedIds = [] } = req.body;
  const allIds = [...new Set([...seenIds, ...savedIds])].filter(id => Number.isInteger(id));

  if (allIds.length === 0) {
    return res.status(200).json({ collections: [], empty: true });
  }

  const pool = getPool();

  try {
    // Find top collections by overlap count, plus which movies matched
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
        LIMIT 30
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
      return res.status(200).json({ collections: [], empty: true });
    }

    // Fetch movie metadata for all matched IDs
    const allMatchedIds = [...new Set(result.rows.flatMap(r => r.matched_tmdb_ids))];
    const moviesResult = await pool.query(
      `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
      [allMatchedIds]
    );
    const movieMap = {};
    for (const m of moviesResult.rows) {
      movieMap[m.tmdb_id] = m;
    }

    // For each collection, fetch 4 representative movies from the full editorial_data
    // Sample evenly across subcategories so the preview is diverse
    const collectionIds = result.rows.map(r => r.id);
    const previewResult = await pool.query(`
      SELECT
        bl.id,
        (mv->>'tmdb_id')::int AS tmdb_id,
        row_number() OVER (PARTITION BY bl.id ORDER BY sub_idx, mv_idx) AS rn
      FROM browse_lists bl,
           jsonb_array_elements(bl.editorial_data->'subcategories') WITH ORDINALITY AS s(sub, sub_idx),
           jsonb_array_elements(s.sub->'movies') WITH ORDINALITY AS m(mv, mv_idx)
      WHERE bl.id = ANY($1)
        AND (mv->>'tmdb_id') IS NOT NULL
        AND (mv->>'tmdb_id') != 'null'
    `, [collectionIds]);

    // Build a map: collectionId -> first 4 tmdb_ids spread across subcategories
    // We sample: row 1,2,3,4 from the ordered list (sub_idx asc, then mv_idx asc)
    // This naturally picks the first movie from each subcategory before cycling back
    const previewIdMap = {};
    for (const row of previewResult.rows) {
      if (row.rn <= 4) {
        if (!previewIdMap[row.id]) previewIdMap[row.id] = [];
        previewIdMap[row.id].push(row.tmdb_id);
      }
    }

    // Fetch poster_url for all preview movie IDs we don't already have
    const allPreviewIds = [...new Set(Object.values(previewIdMap).flat())].filter(
      id => !movieMap[id]
    );
    if (allPreviewIds.length > 0) {
      const extraMovies = await pool.query(
        `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
        [allPreviewIds]
      );
      for (const m of extraMovies.rows) {
        movieMap[m.tmdb_id] = m;
      }
    }

    // Assemble final collections
    const collections = result.rows.map(row => {
      const matchedMovies = row.matched_tmdb_ids
        .map(id => movieMap[id])
        .filter(Boolean);

      const previewIds = previewIdMap[row.id] || [];
      const previewMovies = previewIds
        .map(id => movieMap[id])
        .filter(m => m && m.poster_url);

      // If we couldn't get full collection previews, fall back to matched movies
      const finalPreview = previewMovies.length >= 2 ? previewMovies : matchedMovies;

      return {
        id: row.id,
        title: row.title,
        categories: row.categories || [],
        overlapCount: parseInt(row.overlap_count),
        matchedMovies,
        previewMovies: finalPreview.slice(0, 4),
      };
    });

    return res.status(200).json({ collections });

  } catch (error) {
    console.error('Genius recommendations error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}
