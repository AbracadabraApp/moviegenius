#!/usr/bin/env node

/**
 * browse-dedup.cjs
 *
 * Finds and marks duplicate collections after curation.
 *
 * Matching strategy:
 *   Two collections are duplicates if their normalized word sets are IDENTICAL
 *   after:
 *     1. Lowercasing
 *     2. Stripping punctuation
 *     3. Removing stopwords (Films, Movies, Stories, Dramas, etc.)
 *     4. Porter-stemming each remaining word
 *     5. Sorting alphabetically
 *
 *   Both collections must also share at least one category.
 *
 * Examples that match:
 *   "Cold War Spy Films"   → stem({cold, war, spy})   = "cold war spi"
 *   "Cold War Spy Movies"  → stem({cold, war, spy})   = "cold war spi"  → MATCH
 *
 *   "Prison Escape Film"   → stem({prison, escap})    = "escap prison"
 *   "Prison Escapes"       → stem({prison, escap})    = "escap prison"  → MATCH
 *
 * Examples that do NOT match:
 *   "Alternate History Films"       → "altern histori"
 *   "Alternate History Japan Films" → "altern histori japan"  → NO MATCH (different word set)
 *
 * Winner selection within a cluster:
 *   1. Prefer 'keep' action (Claude was confident original was good)
 *   2. Prefer longer title (more descriptive)
 *   3. Tiebreak: lower id
 *
 * Losers: curation_action = 'merged', duplicate_of = winner revised_title
 * Safe to re-run: skips already-merged rows.
 *
 * Usage:
 *   node --env-file=.env.local scripts/browse-dedup.cjs            # dry run
 *   node --env-file=.env.local scripts/browse-dedup.cjs --apply    # write to DB
 */

const { Pool } = require('pg');
const { PorterStemmer } = require('natural');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Stopwords — medium/format words stripped before comparison
const STOPWORDS = new Set([
  'films', 'film', 'movies', 'movie', 'pictures', 'picture', 'cinema',
  'stories', 'story', 'narratives', 'narrative', 'tales', 'tale',
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  return { dryRun };
}

/**
 * Normalize a title to a canonical key:
 * lowercase → strip punctuation → remove stopwords → Porter-stem → sort → join
 */
function normalize(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOPWORDS.has(w))
    .map(w => PorterStemmer.stem(w))
    .sort()
    .join(' ');
}

async function findDuplicatePairs(client) {
  const { rows } = await client.query(`
    SELECT id, revised_title, curation_action, categories
    FROM browse_lists
    WHERE revised_title IS NOT NULL
      AND curation_action != 'merged'
      AND array_length(categories, 1) > 0
    ORDER BY id
  `);

  // Build map: normalized key → [rows]
  const byKey = new Map();
  for (const row of rows) {
    const key = normalize(row.revised_title);
    if (!key || key.length < 3) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  // Find groups with 2+ entries that share at least one category
  const pairs = [];
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const sharedCats = (a.categories || []).filter(c => (b.categories || []).includes(c));
        if (sharedCats.length > 0) {
          pairs.push({
            id_a: a.id, title_a: a.revised_title, action_a: a.curation_action, cats_a: a.categories,
            id_b: b.id, title_b: b.revised_title, action_b: b.curation_action, cats_b: b.categories,
            key,
          });
        }
      }
    }
  }
  return pairs;
}

function buildClusters(pairs) {
  const parent = new Map();

  function find(id) {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)));
    return parent.get(id);
  }

  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const nodes = new Map();
  for (const p of pairs) {
    nodes.set(p.id_a, { id: p.id_a, title: p.title_a, action: p.action_a, cats: p.cats_a });
    nodes.set(p.id_b, { id: p.id_b, title: p.title_b, action: p.action_b, cats: p.cats_b });
    union(p.id_a, p.id_b);
  }

  const groups = new Map();
  for (const [id] of nodes) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(nodes.get(id));
  }

  return [...groups.values()].filter(g => g.length > 1);
}

function pickWinner(cluster) {
  // 1. Prefer 'keep' (Claude confident)
  // 2. Prefer longer title (more descriptive)
  // 3. Tiebreak: lower id
  return cluster.slice().sort((a, b) => {
    const actionScore = (x) => x.action === 'keep' ? 0 : 1;
    if (actionScore(a) !== actionScore(b)) return actionScore(a) - actionScore(b);
    if (a.title.length !== b.title.length) return b.title.length - a.title.length;
    return a.id < b.id ? -1 : 1;
  })[0];
}

async function applyMerges(client, clusters) {
  let merged = 0;
  for (const cluster of clusters) {
    const winner = pickWinner(cluster);
    const losers = cluster.filter(c => c.id !== winner.id);
    for (const loser of losers) {
      await client.query(`
        UPDATE browse_lists
        SET curation_action = 'merged',
            duplicate_of    = $1
        WHERE id = $2
      `, [winner.title, loser.id]);
      merged++;
    }
  }
  return merged;
}

async function main() {
  const { dryRun } = parseArgs();
  const client = await pool.connect();

  try {
    const { rows: [{ pending }] } = await client.query(
      `SELECT COUNT(*) AS pending FROM browse_lists WHERE revised_title IS NULL AND array_length(categories, 1) > 0`
    );
    if (parseInt(pending) > 0) {
      console.warn(`\n⚠️  Warning: ${pending} collections not yet curated. Run after browse-curate.cjs completes.\n`);
    }

    const { rows: [{ total, already_merged }] } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE revised_title IS NOT NULL) AS total,
        COUNT(*) FILTER (WHERE curation_action = 'merged') AS already_merged
      FROM browse_lists
      WHERE array_length(categories, 1) > 0
    `);

    console.log(`\n🔍 Browse Collection Deduplication`);
    console.log(`   Mode:       ${dryRun ? 'DRY RUN (use --apply to write)' : '⚠️  APPLY MODE'}`);
    console.log(`   Method:     stopword removal + Porter stem + exact match`);
    console.log(`   Curated:    ${total} collections`);
    console.log(`   Pre-merged: ${already_merged}`);
    console.log(`\nFinding duplicates...\n`);

    const pairs = await findDuplicatePairs(client);
    if (pairs.length === 0) {
      console.log('✅ No duplicates found.');
      return;
    }

    const clusters = buildClusters(pairs);
    console.log(`   Found ${clusters.length} duplicate clusters\n`);

    // Report
    let totalLosers = 0;
    for (const cluster of clusters) {
      const winner = pickWinner(cluster);
      const losers = cluster.filter(c => c.id !== winner.id);
      totalLosers += losers.length;

      const sharedCats = (winner.cats || []).filter(c =>
        losers.some(l => (l.cats || []).includes(c))
      );

      console.log(`  KEEP   "${winner.title}"  [${sharedCats.join(', ')}]`);
      for (const loser of losers) {
        console.log(`  MERGE  "${loser.title}"`);
      }
      console.log();
    }

    console.log(`Summary: ${clusters.length} clusters, ${totalLosers} collections to merge`);

    if (dryRun) {
      console.log(`\nRun with --apply to write changes to DB.`);
    } else {
      const merged = await applyMerges(client, clusters);
      console.log(`\n✅ Merged ${merged} collections into winners.`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
