#!/usr/bin/env node

/**
 * browse-dedup.cjs
 *
 * Phase 1: Find and mark near-duplicate collections using pg_trgm similarity.
 *
 * Rules:
 * - Only compares collections that share AT LEAST ONE category
 *   (e.g. "Holocaust Survivor Dramas" vs "Holocaust Documentary Films" share
 *   [History] but are genuinely different things — the similarity threshold
 *   must be high enough to distinguish them)
 * - Similarity threshold: 0.65 on revised_title (conservative to avoid false positives)
 * - Within each duplicate cluster, keeps the "winner":
 *     1. Prefer 'keep' action over 'improve' (Claude was more confident)
 *     2. Prefer shorter revised_title (more specific = better UX)
 *     3. Tiebreak: lower id (older/more established)
 * - Losers get: curation_action = 'merged', duplicate_of = winner's revised_title
 * - Safe to re-run: skips rows already marked 'merged'
 *
 * Run modes:
 *   --dry-run   Show clusters without writing to DB (default)
 *   --apply     Write changes to DB
 *   --threshold N  Override similarity threshold (default 0.65)
 */

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_THRESHOLD = 0.75;

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const threshIdx = args.indexOf('--threshold');
  const threshold = threshIdx !== -1 ? parseFloat(args[threshIdx + 1]) : DEFAULT_THRESHOLD;
  return { dryRun, threshold };
}

async function findClusters(client, threshold) {
  // Find all pairs with shared category + high title similarity.
  // Only considers collections that have been curated (revised_title IS NOT NULL)
  // and are not already marked as merged.
  //
  // We use word_similarity() in addition to similarity() to avoid false positives
  // where shared suffix words ("Dramas", "Films", "Thrillers") inflate the score.
  // Both must pass: overall similarity AND the first word must match (the subject noun).
  const { rows: pairs } = await client.query(`
    SELECT
      a.id       AS id_a,
      a.revised_title AS title_a,
      a.curation_action AS action_a,
      a.categories AS cats_a,
      b.id       AS id_b,
      b.revised_title AS title_b,
      b.curation_action AS action_b,
      b.categories AS cats_b,
      similarity(a.revised_title, b.revised_title) AS sim
    FROM browse_lists a
    JOIN browse_lists b
      ON a.id < b.id
      AND a.categories && b.categories
      AND a.curation_action != 'merged'
      AND b.curation_action != 'merged'
      AND a.revised_title IS NOT NULL
      AND b.revised_title IS NOT NULL
      -- First word (subject) must match exactly or near-exactly
      AND split_part(lower(a.revised_title), ' ', 1) = split_part(lower(b.revised_title), ' ', 1)
    WHERE similarity(a.revised_title, b.revised_title) >= $1
    ORDER BY sim DESC
  `, [threshold]);

  return pairs;
}

function buildClusters(pairs) {
  // Union-find to group transitively connected duplicates into clusters
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

  // Collect all nodes
  const nodes = new Map(); // id -> { id, title, action, categories }
  for (const p of pairs) {
    nodes.set(p.id_a, { id: p.id_a, title: p.title_a, action: p.action_a, cats: p.cats_a });
    nodes.set(p.id_b, { id: p.id_b, title: p.title_b, action: p.action_b, cats: p.cats_b });
    union(p.id_a, p.id_b);
  }

  // Group by root
  const groups = new Map();
  for (const [id] of nodes) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(nodes.get(id));
  }

  return [...groups.values()].filter(g => g.length > 1);
}

function pickWinner(cluster) {
  // 1. Prefer 'keep' (Claude was confident it's already good)
  // 2. Prefer LONGER title — more specific titles are more valuable than vague supersets.
  //    e.g. "Cold War Exile Stories" beats "Cold War Era Stories",
  //         "Human Trafficking Crime Films" beats "Human Trafficking Films"
  // 3. Tiebreak: lower id (older/more established)
  return cluster.slice().sort((a, b) => {
    const actionScore = (x) => x.action === 'keep' ? 0 : 1;
    if (actionScore(a) !== actionScore(b)) return actionScore(a) - actionScore(b);
    if (a.title.length !== b.title.length) return b.title.length - a.title.length; // longer wins
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
  const { dryRun, threshold } = parseArgs();
  const client = await pool.connect();

  try {
    // Check curation is complete before running
    const { rows: [{ pending }] } = await client.query(
      `SELECT COUNT(*) AS pending FROM browse_lists WHERE revised_title IS NULL AND array_length(categories, 1) > 0`
    );
    if (parseInt(pending) > 0) {
      console.warn(`\n⚠️  Warning: ${pending} collections not yet curated. Run after browse-curate.cjs completes for best results.\n`);
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
    console.log(`   Threshold:  ${threshold} similarity`);
    console.log(`   Curated:    ${total} collections`);
    console.log(`   Pre-merged: ${already_merged}`);
    console.log(`\nFinding duplicate clusters...\n`);

    const pairs = await findClusters(client, threshold);
    console.log(`   Found ${pairs.length} similar pairs above threshold ${threshold}`);

    if (pairs.length === 0) {
      console.log('\n✅ No duplicates found.');
      return;
    }

    const clusters = buildClusters(pairs);
    console.log(`   Resolved into ${clusters.length} clusters\n`);

    // Report clusters
    let totalLosers = 0;
    for (const cluster of clusters) {
      const winner = pickWinner(cluster);
      const losers = cluster.filter(c => c.id !== winner.id);
      totalLosers += losers.length;

      const sharedCats = winner.cats.filter(c =>
        losers.some(l => l.cats.includes(c))
      );

      console.log(`  KEEP   "${winner.title}"  [${sharedCats.join(', ')}]`);
      for (const loser of losers) {
        const sim = pairs.find(p =>
          (p.id_a === winner.id && p.id_b === loser.id) ||
          (p.id_b === winner.id && p.id_a === loser.id)
        )?.sim;
        const simStr = sim ? ` (${(sim * 100).toFixed(0)}% similar)` : '';
        console.log(`  MERGE  "${loser.title}"${simStr}`);
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
