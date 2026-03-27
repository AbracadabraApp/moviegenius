/**
 * Genius Recommendations API
 *
 * Given a list of tmdb_ids (seen + saved movies), finds subcategories
 * that contain those movies, ranked by overlap count.
 *
 * Each result is a subcategory (e.g. "World War II Air Combat") with:
 *   - name: subcategory title
 *   - collectionId / collectionTitle: parent collection for navigation
 *   - movies: all movies in the subcategory (6-7 with poster_url)
 *   - overlapCount: how many of the user's movies appear in it
 *
 * POST body: { savedIds: [int] }
 * Returns: { subcategories: [{ name, collectionId, collectionTitle, movies, overlapCount }] }
 */

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { savedIds = [] } = req.body;
  const allIds = [...new Set(savedIds)].filter(id => Number.isInteger(id));

  if (allIds.length === 0) {
    return res.status(200).json({ subcategories: [], empty: true });
  }

  const pool = getPool();

  try {
    // Find subcategories that contain the user's movies, ranked by overlap
    // Also extract all tmdb_ids from each matching subcategory for display
    const result = await pool.query(`
      WITH sub_matches AS (
        SELECT
          bl.id AS collection_id,
          bl.title AS collection_title,
          sub->>'name' AS sub_name,
          sub_idx,
          (mv->>'tmdb_id')::int AS matched_tmdb_id,
          COUNT(*) OVER (PARTITION BY bl.id, sub_idx) AS overlap_count,
          sub AS sub_json
        FROM browse_lists bl,
             jsonb_array_elements(bl.editorial_data->'subcategories') WITH ORDINALITY AS s(sub, sub_idx),
             jsonb_array_elements(s.sub->'movies') mv
        WHERE bl.status = 'active'
          AND bl.is_suppressed IS NOT TRUE
          AND bl.editorial_data IS NOT NULL
          AND (mv->>'tmdb_id') IS NOT NULL
          AND (mv->>'tmdb_id') != 'null'
          AND (mv->>'tmdb_id')::int = ANY($1)
      ),
      top_subs AS (
        SELECT DISTINCT
          collection_id, collection_title, sub_name, sub_idx, overlap_count, sub_json
        FROM sub_matches
        ORDER BY overlap_count DESC, collection_id, sub_idx
        LIMIT 100
      )
      SELECT
        ts.collection_id,
        ts.collection_title,
        ts.sub_name,
        ts.overlap_count,
        array_agg(DISTINCT sm.matched_tmdb_id) AS matched_tmdb_ids,
        -- Extract all tmdb_ids from the subcategory
        array_agg(DISTINCT (mv->>'tmdb_id')::int) AS all_tmdb_ids
      FROM top_subs ts
      JOIN sub_matches sm ON sm.collection_id = ts.collection_id AND sm.sub_idx = ts.sub_idx,
           jsonb_array_elements(ts.sub_json->'movies') mv
      WHERE (mv->>'tmdb_id') IS NOT NULL AND (mv->>'tmdb_id') != 'null'
      GROUP BY ts.collection_id, ts.collection_title, ts.sub_name, ts.overlap_count
      ORDER BY ts.overlap_count DESC
    `, [allIds]);

    if (result.rows.length === 0) {
      return res.status(200).json({ subcategories: [], empty: true });
    }

    // Fetch poster data for all movie IDs across all subcategories
    const allTmdbIds = [...new Set(result.rows.flatMap(r => r.all_tmdb_ids))];
    const moviesResult = await pool.query(
      `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
      [allTmdbIds]
    );
    const movieMap = {};
    for (const m of moviesResult.rows) {
      movieMap[m.tmdb_id] = m;
    }

    // Build all candidates with movie data
    const candidates = result.rows.map(row => {
      const matchedSet = new Set(row.matched_tmdb_ids);
      const movies = row.all_tmdb_ids
        .map(id => movieMap[id])
        .filter(m => m && m.poster_url)
        .sort((a, b) => (matchedSet.has(a.tmdb_id) ? 0 : 1) - (matchedSet.has(b.tmdb_id) ? 0 : 1));

      return {
        name: row.sub_name,
        collectionId: row.collection_id,
        collectionTitle: row.collection_title,
        overlapCount: parseInt(row.overlap_count),
        matchedTmdbIds: row.matched_tmdb_ids,
        movies,
      };
    });

    // Dedup pass 1: each seed movie can only be the primary driver of 1 subcategory.
    // "Primary driver" = the matched movie that appears in fewest other candidates
    // (most distinctive). If a movie drives 10 subcategories, only the best one shows.
    const usedSeeds = new Set();
    const usedCollections = new Set();
    const subcategories = [];

    for (const candidate of candidates) {
      // Each parent collection can only appear once
      if (usedCollections.has(candidate.collectionId)) continue;

      // Each seed movie can only drive one result
      const unusedSeeds = candidate.matchedTmdbIds.filter(id => !usedSeeds.has(id));
      if (unusedSeeds.length === 0) continue;

      // Accept — mark seeds and collection as used
      candidate.matchedTmdbIds.forEach(id => usedSeeds.add(id));
      usedCollections.add(candidate.collectionId);

      subcategories.push({
        name: candidate.name,
        collectionId: candidate.collectionId,
        collectionTitle: candidate.collectionTitle,
        overlapCount: candidate.overlapCount,
        movies: candidate.movies,
      });

      if (subcategories.length >= 20) break;
    }

    return res.status(200).json({ subcategories });

  } catch (error) {
    console.error('Genius recommendations error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}
