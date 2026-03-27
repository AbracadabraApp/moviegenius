#!/usr/bin/env node

/**
 * Subcategory Expansion Batch Processor
 *
 * For active collections where the first subcategory has < 6 movies,
 * asks Claude to suggest additional films, then matches them against
 * the movies table using the standard 7-step title matching strategy.
 *
 * Usage:
 *   node --env-file=.env.local scripts/expand-subcategories.cjs submit [limit]
 *   node --env-file=.env.local scripts/expand-subcategories.cjs process <batch_id>
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

// Deferred so env vars are loaded before instantiation
let _anthropic, _pool;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 15 });
  return _pool;
}

const PROMPT = (collectionTitle, subcategoryName) =>
  `You are a film expert. Given a collection title and subcategory name, suggest films that belong in that subcategory.

Collection: ${collectionTitle}
Subcategory: ${subcategoryName}

Return a JSON array of suggested films. Format:

[
  { "title": "Film Title", "year": 1985 },
  ...
]

Return raw JSON only. No markdown, no code fences, no explanation.`;

// ---------------------------------------------------------------------------
// Title matching (same 7-step strategy as batch-whywatch-movie-links.js)
// ---------------------------------------------------------------------------

function normalizeTitle(title) {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

async function findMovie(title, year, client) {
  const normalized = normalizeTitle(title);

  // Try 1: Exact title + year
  if (year) {
    const r = await client.query(
      'SELECT id, tmdb_id, title, year FROM movies WHERE title = $1 AND year = $2 LIMIT 1',
      [title, year]
    );
    if (r.rows.length > 0) return r.rows[0];
  }

  // Try 2: Exact match original title
  let r = await client.query(
    'SELECT id, tmdb_id, title, year FROM movies WHERE title = $1 LIMIT 1',
    [title]
  );
  if (r.rows.length > 0) return r.rows[0];

  // Try 3: Exact match normalized title
  if (normalized !== title) {
    r = await client.query(
      'SELECT id, tmdb_id, title, year FROM movies WHERE title = $1 LIMIT 1',
      [normalized]
    );
    if (r.rows.length > 0) return r.rows[0];
  }

  // Try 4: Case-insensitive
  r = await client.query(
    'SELECT id, tmdb_id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
    [normalized]
  );
  if (r.rows.length > 0) return r.rows[0];

  // Try 5: Add "The" prefix
  if (!normalized.toLowerCase().startsWith('the ')) {
    r = await client.query(
      'SELECT id, tmdb_id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [`The ${normalized}`]
    );
    if (r.rows.length > 0) return r.rows[0];
  }

  // Try 6: Remove "The" prefix
  if (normalized.toLowerCase().startsWith('the ')) {
    r = await client.query(
      'SELECT id, tmdb_id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [normalized.substring(4)]
    );
    if (r.rows.length > 0) return r.rows[0];
  }

  // Try 7: Starts-with (franchise names), lowest year first
  r = await client.query(
    `SELECT id, tmdb_id, title, year FROM movies
     WHERE LOWER(title) LIKE LOWER($1) || '%'
     ORDER BY year ASC LIMIT 1`,
    [normalized]
  );
  if (r.rows.length > 0) return r.rows[0];

  return null;
}

// ---------------------------------------------------------------------------
// Phase 1: Submit batch
// ---------------------------------------------------------------------------

async function submit(limit) {
  const pool = getPool();
  const anthropic = getAnthropic();
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT id, title,
        editorial_data->'subcategories'->0->>'name' AS sub_name,
        jsonb_array_length(editorial_data->'subcategories'->0->'movies') AS movie_count
      FROM browse_lists
      WHERE status = 'active'
        AND is_suppressed = false
        AND editorial_data->'subcategories' IS NOT NULL
        AND jsonb_array_length(editorial_data->'subcategories') > 0
        AND jsonb_array_length(editorial_data->'subcategories'->0->'movies') < 6
      ORDER BY RANDOM()
      LIMIT $1
    `, [limit]);

    console.log(`Found ${rows.length} collections to expand`);

    const requests = rows.map(col => ({
      custom_id: col.id,
      params: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        messages: [{ role: 'user', content: PROMPT(col.title, col.sub_name) }],
      },
    }));

    const batch = await anthropic.beta.messages.batches.create({ requests });
    console.log(`Batch submitted: ${batch.id}`);
    console.log(`Status: ${batch.processing_status}`);
    console.log(`\nTo process results run:`);
    console.log(`  node --env-file=.env.local scripts/expand-subcategories.cjs process ${batch.id}`);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Process batch results
// ---------------------------------------------------------------------------

async function processBatch(batchId) {
  const pool = getPool();
  const anthropic = getAnthropic();

  console.log(`Polling batch ${batchId}...`);

  let batch;
  while (true) {
    batch = await anthropic.beta.messages.batches.retrieve(batchId);
    console.log(`Status: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
    if (batch.processing_status === 'ended') break;
    await new Promise(r => setTimeout(r, 10000));
  }

  const results = await anthropic.beta.messages.batches.results(batchId);
  const client = await pool.connect();

  let totalMatched = 0;
  let totalSuggested = 0;
  let collectionsUpdated = 0;
  let parseErrors = 0;
  const lowMatchCollections = []; // { id, title, matchRate, suggested, matched }

  try {
    for await (const result of results) {
      if (result.result.type !== 'succeeded') continue;

      const collectionId = result.custom_id;
      const text = result.result.message.content[0].text
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

      let suggestions;
      try {
        suggestions = JSON.parse(text);
      } catch (e) {
        console.error(`Parse error for ${collectionId}: ${e.message}`);
        parseErrors++;
        continue;
      }

      // Match each suggestion against the movies table
      const matched = [];
      const seen = new Set();
      for (const s of suggestions) {
        if (!s.title) continue;
        const movie = await findMovie(s.title, s.year, client);
        if (movie && !seen.has(movie.id)) {
          seen.add(movie.id);
          matched.push({ note: null, year: movie.year, title: movie.title, tmdb_id: movie.tmdb_id });
        }
      }

      totalSuggested += suggestions.length;
      const matchRate = suggestions.length ? matched.length / suggestions.length : 0;

      // Fetch collection title + editorial_data
      const { rows } = await client.query(
        'SELECT title, editorial_data FROM browse_lists WHERE id = $1',
        [collectionId]
      );
      if (!rows.length) continue;

      const collectionTitle = rows[0].title;
      const subName = rows[0].editorial_data.subcategories[0].name;

      // Flag low match rate collections for review
      if (matchRate < 0.5) {
        lowMatchCollections.push({ id: collectionId, title: collectionTitle, subName, matchRate: Math.round(matchRate * 100), suggested: suggestions.length, matched: matched.length });
      }

      if (matched.length === 0) continue;

      const ed = rows[0].editorial_data;
      const sub = ed.subcategories[0];
      const existingTmdbIds = new Set(sub.movies.map(m => m.tmdb_id));

      const toAdd = matched.filter(m => m.tmdb_id && !existingTmdbIds.has(m.tmdb_id));
      if (toAdd.length === 0) continue;

      sub.movies.push(...toAdd);
      totalMatched += toAdd.length;

      await client.query(
        'UPDATE browse_lists SET editorial_data = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(ed), collectionId]
      );

      collectionsUpdated++;
      console.log(`  [${Math.round(matchRate * 100)}%] ${collectionTitle} / ${subName}: +${toAdd.length} (${toAdd.map(m => m.title).join(', ')})`);
    }
  } finally {
    client.release();
  }

  console.log(`\n--- Done ---`);
  console.log(`Collections updated:           ${collectionsUpdated}`);
  console.log(`Movies matched & added:        ${totalMatched}`);
  console.log(`Total suggestions from Claude: ${totalSuggested}`);
  console.log(`Parse errors:                  ${parseErrors}`);
  console.log(`Overall match rate:            ${totalSuggested ? ((totalMatched / totalSuggested) * 100).toFixed(1) : 0}%`);

  if (lowMatchCollections.length > 0) {
    console.log(`\n--- REVIEW: Low match rate collections (<50%) ---`);
    lowMatchCollections
      .sort((a, b) => a.matchRate - b.matchRate)
      .forEach(c => console.log(`  ${c.matchRate}%  ${c.title} / ${c.subName}  (${c.matched}/${c.suggested})  ${c.id}`));
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];
const arg = args[1];

function end() { if (_pool) _pool.end(); }

if (command === 'submit') {
  submit(arg ? parseInt(arg) : 500)
    .then(end)
    .catch(e => { console.error(e); end(); process.exit(1); });
} else if (command === 'process') {
  if (!arg) { console.error('Usage: ... process <batch_id>'); process.exit(1); }
  processBatch(arg)
    .then(end)
    .catch(e => { console.error(e); end(); process.exit(1); });
} else {
  console.log('Usage:');
  console.log('  node --env-file=.env.local scripts/expand-subcategories.cjs submit [limit]');
  console.log('  node --env-file=.env.local scripts/expand-subcategories.cjs process <batch_id>');
}
