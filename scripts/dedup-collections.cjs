#!/usr/bin/env node
// dedup-collections.cjs
// Uses Haiku to identify semantically redundant collections within each category.
// Marks duplicates as suppressed via is_suppressed = TRUE on browse_lists.
//
// Usage:
//   node --env-file=.env.local scripts/dedup-collections.cjs            # dry run
//   node --env-file=.env.local scripts/dedup-collections.cjs --live     # write to DB
//   node --env-file=.env.local scripts/dedup-collections.cjs --category Drama  # one category
//   node --env-file=.env.local scripts/dedup-collections.cjs --category Drama --live

'use strict';

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic();

const LIVE = process.argv.includes('--live');
const CATEGORY_FILTER = (() => {
  const i = process.argv.indexOf('--category');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const CHUNK_SIZE = 1500;   // max collections per Haiku call
const CHUNK_OVERLAP = 150; // overlap between chunks to catch boundary duplicates
const MAX_OUTPUT_TOKENS = 8192;

// --- DB setup ---

async function ensureColumn() {
  await pool.query(`
    ALTER TABLE browse_lists
    ADD COLUMN IF NOT EXISTS is_suppressed BOOLEAN DEFAULT FALSE
  `);
}

// --- Data fetch ---

async function fetchCategory(category) {
  const result = await pool.query(`
    SELECT bl.id, COALESCE(bl.revised_title, bl.title) AS title,
           array_to_string(
             ARRAY(SELECT sub->>'name'
                   FROM jsonb_array_elements(bl.editorial_data->'subcategories') sub
                   LIMIT 4),
             ' | '
           ) AS subcats
    FROM browse_lists bl
    WHERE bl.status = 'active'
      AND bl.is_suppressed IS NOT TRUE
      AND bl.categories[1] = $1
      AND bl.editorial_data IS NOT NULL
    ORDER BY bl.id
  `, [category]);
  return result.rows;
}

async function fetchAllCategories() {
  const result = await pool.query(`
    SELECT categories[1] AS category, COUNT(*) AS cnt
    FROM browse_lists
    WHERE status = 'active'
      AND is_suppressed IS NOT TRUE
      AND editorial_data IS NOT NULL
      AND categories[1] IS NOT NULL
    GROUP BY categories[1]
    ORDER BY cnt DESC
  `);
  return result.rows;
}

// --- Haiku call ---

function buildPrompt(collections, category) {
  const listText = collections.map((c, i) =>
    `[${i + 1}] ${c.title}\n    Subcategories: ${c.subcats || '(none)'}`
  ).join('\n\n');

  return `You are reviewing ${collections.length} movie collection titles in the "${category}" category for a streaming discovery product. Each entry has a title and its subcategory names.

Your task: identify clusters of collections that are semantically redundant — meaning they cover essentially the same thematic territory and would contain largely the same movies.

Rules:
- Only flag genuine redundancy. Collections with meaningfully different scope should NOT be clustered.
- Each collection number appears in at most one cluster.
- For each cluster, keep the most specific/distinctive title; suppress the rest.
- If no redundant pairs exist, output nothing.

Output format — strictly one cluster per block, no other text:
CLUSTER: [theme description]
KEEP: [number] [title]
SUPPRESS: [number] [title]
SUPPRESS: [number] [title]

Here are the collections:

${listText}`;
}

async function callHaiku(collections, category) {
  const prompt = buildPrompt(collections, category);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: 'user', content: prompt }]
  });

  return {
    text: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    truncated: response.stop_reason === 'max_tokens'
  };
}

// --- Parse Haiku output ---

function parseSuppressed(text, collections) {
  // Map position number -> collection id
  const posToId = {};
  collections.forEach((c, i) => { posToId[i + 1] = c.id; });

  const suppressedIds = new Set();
  const clusters = [];
  let currentCluster = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('CLUSTER:')) {
      currentCluster = { theme: trimmed.replace('CLUSTER:', '').trim(), keep: null, suppress: [] };
      clusters.push(currentCluster);
    } else if (trimmed.startsWith('KEEP:') && currentCluster) {
      const match = trimmed.match(/KEEP:\s*\[?(\d+)\]?/);
      if (match) currentCluster.keep = parseInt(match[1]);
    } else if (trimmed.startsWith('SUPPRESS:') && currentCluster) {
      const match = trimmed.match(/SUPPRESS:\s*\[?(\d+)\]?/);
      if (match) {
        const num = parseInt(match[1]);
        currentCluster.suppress.push(num);
        const id = posToId[num];
        if (id) suppressedIds.add(id);
      }
    }
  }

  return { suppressedIds, clusters };
}

// --- Apply to DB ---

async function applySuppression(ids) {
  if (ids.size === 0) return 0;
  const result = await pool.query(`
    UPDATE browse_lists
    SET is_suppressed = TRUE
    WHERE id = ANY($1::uuid[])
      AND is_suppressed IS NOT TRUE
  `, [Array.from(ids)]);
  return result.rowCount;
}

// --- Process one category ---

async function processCategory(category) {
  const collections = await fetchCategory(category);
  if (collections.length === 0) {
    console.log(`  ${category}: no collections, skipping`);
    return { suppressed: 0, total: 0, cost: 0 };
  }

  console.log(`  ${category}: ${collections.length} collections`);

  // Split into overlapping chunks if needed
  const chunks = [];
  if (collections.length <= CHUNK_SIZE) {
    chunks.push(collections);
  } else {
    let start = 0;
    while (start < collections.length) {
      chunks.push(collections.slice(start, start + CHUNK_SIZE));
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    console.log(`    → split into ${chunks.length} chunks`);
  }

  const allSuppressedIds = new Set();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let anyTruncated = false;

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    if (chunks.length > 1) process.stdout.write(`    chunk ${ci + 1}/${chunks.length}... `);

    const { text, inputTokens, outputTokens, truncated } = await callHaiku(chunk, category);
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    if (truncated) anyTruncated = true;

    const { suppressedIds, clusters } = parseSuppressed(text, chunk);

    // Deduplicate: if an id was kept in one chunk, don't suppress it from another
    suppressedIds.forEach(id => allSuppressedIds.add(id));

    if (chunks.length > 1) {
      console.log(`${clusters.length} clusters, ${suppressedIds.size} to suppress`);
    }

    // Small delay to avoid rate limits
    if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  if (anyTruncated) {
    console.log(`    ⚠️  output truncated — some duplicates may be missed`);
  }

  // Cost estimate: Haiku input $0.80/M, output $4.00/M
  const cost = (totalInputTokens / 1_000_000 * 0.80) + (totalOutputTokens / 1_000_000 * 4.00);

  const suppressRate = Math.round(allSuppressedIds.size / collections.length * 100);
  console.log(`    → ${allSuppressedIds.size} to suppress (${suppressRate}%), $${cost.toFixed(3)}`);

  if (LIVE && allSuppressedIds.size > 0) {
    const updated = await applySuppression(allSuppressedIds);
    console.log(`    ✓ marked ${updated} as suppressed`);
  }

  return { suppressed: allSuppressedIds.size, total: collections.length, cost };
}

// --- Main ---

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE (writing to DB)' : 'DRY RUN (no writes)'}\n`);

  await ensureColumn();

  const categories = CATEGORY_FILTER
    ? [{ category: CATEGORY_FILTER }]
    : await fetchAllCategories();

  let totalSuppressed = 0;
  let totalCollections = 0;
  let totalCost = 0;

  for (const { category } of categories) {
    const result = await processCategory(category);
    totalSuppressed += result.suppressed;
    totalCollections += result.total;
    totalCost += result.cost;
    // Pause between categories
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total collections reviewed: ${totalCollections}`);
  console.log(`Total to suppress: ${totalSuppressed} (${Math.round(totalSuppressed / totalCollections * 100)}%)`);
  console.log(`Total cost: $${totalCost.toFixed(3)}`);
  if (!LIVE) console.log('\nRun with --live to apply suppressions to the database.');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
