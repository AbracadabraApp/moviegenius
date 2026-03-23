#!/usr/bin/env node

/**
 * browse-curate.cjs
 *
 * Reviews all browse_lists titles using Claude:
 * - Keeps good titles as-is
 * - Rewrites dry/vague/awkward titles
 * - Flags near-duplicates
 *
 * Results stored in revised_title, curation_action, curation_note, duplicate_of
 * Resume-safe: skips rows where revised_title IS NOT NULL
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MODEL = 'claude-sonnet-4-6';
const BATCH_SIZE = 75;
const CONCURRENCY = 3;
const COST_INPUT_PER_M  = 3.00;
const COST_OUTPUT_PER_M = 15.00;

const PROMPT = (collections) => `You're helping curate a movie discovery platform — intelligent, meaningful, and appealing to people who take movies seriously.

Here are ${collections.length} collection names, each with their genre aisles. Collections span everything: Holocaust films, horror, romantic comedies, war, animation — all treated with equal seriousness.

Review them:
- Keep ones that already work well
- Improve ones that are vague, academic, or awkward
- Flag near-duplicates within this batch

For improvements: clear and specific, max 5 words. The reader should immediately know what's in the collection — like "Summer Camp Horror" or "Stalinist Purge Dramas". Don't add mood, personality, or humor; just say what it is.

Return JSON only (no markdown):
[
  {
    "id": "...",
    "original": "...",
    "revised": "...",
    "action": "keep" | "improve" | "duplicate",
    "duplicate_of": "original title if duplicate, else null",
    "note": "brief reason if improved or flagged, else null"
  }
]

Collections:
${JSON.stringify(collections, null, 2)}`;

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function curateBatch(batch) {
  const collections = batch.map(r => ({
    id: r.id,
    title: r.title,
    genres: r.categories
  }));

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: PROMPT(collections) }]
  });

  const raw = msg.content[0].text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const results = JSON.parse(raw);

  const cost = (
    msg.usage.input_tokens  * COST_INPUT_PER_M  / 1_000_000 +
    msg.usage.output_tokens * COST_OUTPUT_PER_M / 1_000_000
  );

  return { results, cost };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function saveBatch(client, results) {
  for (const r of results) {
    if (!UUID_RE.test(r.id)) {
      process.stderr.write(`\nSkipping malformed id: ${r.id}\n`);
      continue;
    }
    const revisedTitle = r.action === 'improve' ? r.revised : r.original;
    await client.query(`
      UPDATE browse_lists
      SET revised_title   = $1,
          curation_action = $2,
          curation_note   = $3,
          duplicate_of    = $4
      WHERE id = $5
    `, [revisedTitle, r.action, r.note || null, r.duplicate_of || null, r.id]);
  }
}

async function main() {
  const limitArg = process.argv.indexOf('--limit');
  const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : null;

  const client = await pool.connect();

  try {
    const { rows: allPending } = await client.query(`
      SELECT id, title, categories
      FROM browse_lists
      WHERE revised_title IS NULL
        AND array_length(categories, 1) > 0
      ORDER BY id
    `);

    const pending = LIMIT ? allPending.slice(0, LIMIT) : allPending;
    const total = pending.length;

    if (total === 0) {
      console.log('✅ All collections already curated.');
      return;
    }

    const { rows: [{ count: alreadyDone }] } = await client.query(
      `SELECT COUNT(*) FROM browse_lists WHERE revised_title IS NOT NULL`
    );
    const grandTotal = total + parseInt(alreadyDone);

    console.log(`\n🎬 Browse Collection Curation`);
    console.log(`   Model:       ${MODEL}`);
    console.log(`   Batch size:  ${BATCH_SIZE}`);
    console.log(`   Concurrency: ${CONCURRENCY} parallel batches`);
    console.log(`   Pending:     ${total.toLocaleString()} collections`);
    console.log(`   Done:        ${parseInt(alreadyDone).toLocaleString()} collections`);
    if (LIMIT) console.log(`   Limit:       ${LIMIT}`);
    console.log(`\nStarting in 3 seconds...\n`);
    await new Promise(r => setTimeout(r, 3000));

    let done      = parseInt(alreadyDone);
    let kept      = 0;
    let improved  = 0;
    let dupes     = 0;
    let failures  = 0;
    let totalCost = 0;
    const startTime = Date.now();

    // Process in chunks of CONCURRENCY batches at a time
    const batches = [];
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      batches.push(pending.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const chunk = batches.slice(i, i + CONCURRENCY);

      const chunkResults = await Promise.allSettled(
        chunk.map(batch => curateBatch(batch))
      );

      for (let j = 0; j < chunk.length; j++) {
        const batch = chunk[j];
        const result = chunkResults[j];

        if (result.status === 'rejected') {
          failures += batch.length;
          done += batch.length;
          process.stderr.write(`\nBatch error: ${result.reason.message}\n`);
          continue;
        }

        const { results, cost } = result.value;
        totalCost += cost;

        await saveBatch(client, results);

        results.forEach(r => {
          if (r.action === 'keep')      kept++;
          else if (r.action === 'improve') improved++;
          else if (r.action === 'duplicate') dupes++;
        });
        done += results.length;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const rate    = done > parseInt(alreadyDone)
        ? ((done - parseInt(alreadyDone)) / elapsed * 60).toFixed(0)
        : '0';
      const remaining = done > parseInt(alreadyDone)
        ? Math.round((grandTotal - done) / ((done - parseInt(alreadyDone)) / elapsed))
        : 0;
      const eta = remaining > 0 ? formatDuration(remaining) : '--';
      const pct = ((done / grandTotal) * 100).toFixed(1);

      process.stdout.write(
        `\r[${done}/${grandTotal}] ${pct}% | ${rate} col/min | $${totalCost.toFixed(2)} | ETA ${eta} | kept=${kept} improved=${improved} dupes=${dupes}`.padEnd(120)
      );
    }

    const elapsed = formatDuration((Date.now() - startTime) / 1000);
    console.log(`\n\n✅ Curation complete`);
    console.log(`   Kept:     ${kept}`);
    console.log(`   Improved: ${improved}`);
    console.log(`   Dupes:    ${dupes}`);
    console.log(`   Failures: ${failures}`);
    console.log(`   Cost:     $${totalCost.toFixed(2)}`);
    console.log(`   Time:     ${elapsed}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
