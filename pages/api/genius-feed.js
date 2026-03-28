/**
 * Genius Feed API
 *
 * Uses the More Ideas graph to build a personalized feed.
 *
 * Algorithm:
 *   1. Random sample up to 15 from the user's Want to Watch movies as seeds
 *   2. Fetch more_ideas for those seeds
 *   3. Count how many seeds point to each related movie (score)
 *   4. Skip singletons (score=1) and the top cluster (obvious)
 *   5. Use those related movies to find browse_list collections
 *   6. Interleave: movie, movie, collection, movie, movie, collection...
 *
 * POST body: { savedIds: [int] }
 * Returns: { items: [ {type:'movie', ...} | {type:'collection', ...} ] }
 */

import { getPool } from '../../lib/database';

function randomSample(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { savedIds = [] } = req.body;
  const allIds = [...new Set(savedIds)].filter(id => Number.isInteger(id));

  if (allIds.length === 0) {
    return res.status(200).json({ items: [], empty: true });
  }

  // Random sample of up to 15 seeds
  const seedIds = randomSample(allIds, 15);

  const pool = getPool();

  try {
    // Step 1: Fetch more_ideas for the seed movies
    const ideasResult = await pool.query(
      `SELECT tmdb_id, ideas FROM more_ideas WHERE tmdb_id = ANY($1)`,
      [seedIds]
    );

    if (ideasResult.rows.length === 0) {
      return res.status(200).json({ items: [], empty: true });
    }

    // Step 2: Count how many seeds point to each related movie, keyed by tmdbId
    const scores = {};
    for (const row of ideasResult.rows) {
      let ideas = row.ideas;
      if (!Array.isArray(ideas)) {
        if (ideas?.moreIdeas) ideas = ideas.moreIdeas;
        else if (ideas?.ideas) ideas = ideas.ideas;
        else continue;
      }
      for (const idea of ideas) {
        const tmdbId = idea.tmdbId || idea.tmdb_id;
        if (!tmdbId || !Number.isInteger(tmdbId)) continue;
        if (!scores[tmdbId]) scores[tmdbId] = { tmdbId, count: 0 };
        scores[tmdbId].count++;
      }
    }

    // Step 3: Sort by count, skip singletons and the top cluster
    const sorted = Object.values(scores)
      .filter(s => s.count >= 2)
      .sort((a, b) => b.count - a.count);

    const maxCount = sorted[0]?.count ?? 0;
    const candidates = maxCount > 2
      ? sorted.filter(s => s.count < maxCount)
      : sorted;

    if (candidates.length === 0) {
      return res.status(200).json({ items: [], empty: true });
    }

    // Step 4: Fetch posters directly by tmdb_id — no title matching needed
    const candidateIds = candidates.map(c => c.tmdbId);
    const movieRows = await pool.query(
      `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
      [candidateIds]
    );

    const movieLookup = {};
    for (const m of movieRows.rows) movieLookup[m.tmdb_id] = m;

    // Enrich candidates — skip already-saved movies, require poster
    const seenTmdbIds = new Set(allIds);
    const enriched = [];
    for (const c of candidates) {
      const m = movieLookup[c.tmdbId];
      if (!m || !m.poster_url || seenTmdbIds.has(m.tmdb_id)) continue;
      seenTmdbIds.add(m.tmdb_id);
      enriched.push({ tmdbId: m.tmdb_id, title: m.title, year: m.year, posterUrl: m.poster_url });
    }

    // Step 5: Find collections containing these related movies
    const relatedTmdbIds = enriched.map(e => e.tmdbId);
    let collections = [];

    if (relatedTmdbIds.length > 0) {
      const colResult = await pool.query(`
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
          SELECT DISTINCT collection_id, collection_title, sub_name, sub_idx, overlap_count, sub_json
          FROM sub_matches
          ORDER BY overlap_count DESC, collection_id, sub_idx
          LIMIT 50
        )
        SELECT
          ts.collection_id,
          ts.collection_title,
          ts.sub_name,
          ts.overlap_count,
          array_agg(DISTINCT (mv->>'tmdb_id')::int) AS all_tmdb_ids
        FROM top_subs ts,
             jsonb_array_elements(ts.sub_json->'movies') mv
        WHERE (mv->>'tmdb_id') IS NOT NULL AND (mv->>'tmdb_id') != 'null'
        GROUP BY ts.collection_id, ts.collection_title, ts.sub_name, ts.overlap_count
        ORDER BY ts.overlap_count DESC
      `, [relatedTmdbIds]);

      const allColIds = [...new Set(colResult.rows.flatMap(r => r.all_tmdb_ids))];
      const colMoviesResult = await pool.query(
        `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
        [allColIds]
      );
      const colMovieMap = {};
      for (const m of colMoviesResult.rows) colMovieMap[m.tmdb_id] = m;

      const usedCollections = new Set();
      for (const row of colResult.rows) {
        if (usedCollections.has(row.collection_id)) continue;
        usedCollections.add(row.collection_id);

        const movies = row.all_tmdb_ids
          .map(id => colMovieMap[id])
          .filter(m => m && m.poster_url)
          .slice(0, 6);

        if (movies.length < 3) continue;

        collections.push({
          type: 'collection',
          name: row.sub_name,
          collectionId: row.collection_id,
          collectionTitle: row.collection_title,
          movies,
        });

        if (collections.length >= 20) break;
      }
    }

    // Step 6: Interleave — movie, movie, collection, repeating
    const items = [];
    let movieIdx = 0;
    let collectionIdx = 0;

    while (movieIdx < enriched.length || collectionIdx < collections.length) {
      for (let i = 0; i < 2 && movieIdx < enriched.length; i++) {
        items.push({ type: 'movie', ...enriched[movieIdx++] });
      }
      if (collectionIdx < collections.length) {
        items.push(collections[collectionIdx++]);
      }
      if (items.length >= 30) break;
    }

    return res.status(200).json({ items });

  } catch (error) {
    console.error('Genius feed error:', error);
    return res.status(500).json({ error: 'Failed to build feed' });
  }
}
