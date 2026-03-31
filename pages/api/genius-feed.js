/**
 * Genius Feed API
 *
 * Builds a personalized feed using More Ideas + browse_list collections.
 *
 * Algorithm:
 *   1. Random sample up to 5 seeds from savedIds that have a more_ideas row
 *   2. Fetch all ideas for all seeds in one query
 *   3. Build one 'more_ideas' item per seed (top 2 movies)
 *   4. Find browse_list collections that overlap with all More Ideas candidates
 *   5. Interleave: more_ideas, collection, more_ideas, collection...
 *
 * POST body: { savedIds: [int] }
 * Returns: { items: [ {type:'more_ideas', ...} | {type:'collection', ...} ] }
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

  const pool = getPool();

  try {
    // Step 1: Find saved movies that have more_ideas rows, sample up to 5
    const ideasResult = await pool.query(
      `SELECT tmdb_id, ideas FROM more_ideas WHERE tmdb_id = ANY($1)`,
      [allIds]
    );

    if (ideasResult.rows.length === 0) {
      return res.status(200).json({ items: [], empty: true });
    }

    const seedRows = randomSample(ideasResult.rows, 5);

    // Step 2: Parse ideas per seed, collect all candidate tmdb_ids
    const seedData = []; // { tmdbId, seedTitle (filled later), ideas: [{tmdbId},...] }
    const allCandidateIds = new Set();

    for (const row of seedRows) {
      let ideas = row.ideas;
      if (!Array.isArray(ideas)) {
        if (ideas?.moreIdeas) ideas = ideas.moreIdeas;
        else if (ideas?.ideas) ideas = ideas.ideas;
        else continue;
      }
      const tmdbIds = ideas
        .map(idea => idea.tmdbId || idea.tmdb_id)
        .filter(id => id && Number.isInteger(id));

      tmdbIds.forEach(id => allCandidateIds.add(id));
      seedData.push({ seedTmdbId: row.tmdb_id, ideaTmdbIds: tmdbIds });
    }

    if (seedData.length === 0) {
      return res.status(200).json({ items: [], empty: true });
    }

    // Step 3: Fetch movie data for all seeds + all candidates in one query
    const allLookupIds = [...new Set([
      ...seedData.map(s => s.seedTmdbId),
      ...allCandidateIds
    ])];

    const movieRows = await pool.query(
      `SELECT tmdb_id, title, year, poster_url, slug FROM movies WHERE tmdb_id = ANY($1)`,
      [allLookupIds]
    );
    const movieLookup = {};
    for (const m of movieRows.rows) movieLookup[m.tmdb_id] = m;

    // Step 4: Build more_ideas items — top 2 movies per seed
    const moreIdeasItems = [];
    for (const seed of seedData) {
      const seedMovie = movieLookup[seed.seedTmdbId];
      const seedTitle = seedMovie?.title || `Movie ${seed.seedTmdbId}`;

      const movies = seed.ideaTmdbIds
        .slice(0, 2)
        .map(id => movieLookup[id])
        .filter(Boolean);

      if (movies.length === 0) continue;

      moreIdeasItems.push({
        type: 'more_ideas',
        seedTitle,
        seedTmdbId: seed.seedTmdbId,
        movies,
      });
    }

    // Step 5: Find collections overlapping with all More Ideas candidates
    const relatedTmdbIds = [...allCandidateIds];
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
        `SELECT tmdb_id, title, year, poster_url, slug FROM movies WHERE tmdb_id = ANY($1)`,
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
          .slice(0, 8);

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

    // Step 6: Interleave — more_ideas, collection, more_ideas, collection...
    const items = [];
    let moreIdeasIdx = 0;
    let collectionIdx = 0;

    while (moreIdeasIdx < moreIdeasItems.length || collectionIdx < collections.length) {
      if (moreIdeasIdx < moreIdeasItems.length) {
        items.push(moreIdeasItems[moreIdeasIdx++]);
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
