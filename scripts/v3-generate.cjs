#!/usr/bin/env node

/**
 * V3 WhyWatch Generation Script
 *
 * Generates enhanced_why_watch_v3 for all movies in the database.
 * - Auto-resumes: DB is source of truth, skips already-done movies
 * - Parallel: 5 concurrent requests (~5x faster)
 * - Retries: 3x with exponential backoff (1s, 2s, 4s)
 * - Failures: written to logs/v3-failures.log after exhausting retries
 * - Progress: inline update + heartbeat every 60s
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MODEL = 'claude-sonnet-4-6';
const PROMPT_VERSION = 'v3';
const CONCURRENCY = 5;
const DB_BATCH_SIZE = 100;
const RETRY_DELAYS = [1000, 2000, 4000];
const HEARTBEAT_INTERVAL = 60 * 1000;

const COST_INPUT_PER_M  = 3.00;
const COST_OUTPUT_PER_M = 15.00;

const PROMPT = `Would you recommend {TITLE} ({YEAR}) to a friend who loves movies? Judge it honestly against others in its genre or series. Say NO if it's forgettable, wastes the viewer's time, or a serious movie lover would regret watching it. Give 2-3 reasons (5-8 words each) — be specific about dialogue, performances, or genre standing; tell the reader an important fact. In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

const FAILURES_LOG = path.join(__dirname, '../logs/v3-failures.log');

if (!fs.existsSync(path.join(__dirname, '../logs'))) {
  fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });
}

function logFailure(movie, error) {
  const line = `${new Date().toISOString()} | tmdb_id=${movie.tmdb_id} | "${movie.title}" (${movie.year}) | ${error}\n`;
  fs.appendFileSync(FAILURES_LOG, line);
}

function formatProgress(done, total, cost, startTime) {
  const pct = ((done / total) * 100).toFixed(1);
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = done > 0 ? (done / elapsed * 60).toFixed(1) : '0.0';
  const remaining = done > 0 ? Math.round((total - done) / (done / elapsed)) : 0;
  const eta = remaining > 0 ? formatDuration(remaining) : '--';
  const bar = buildBar(done, total, 20);
  return `[${done}/${total}] ${bar} ${pct}% | ${rate} mov/min | $${cost.toFixed(2)} | ETA ${eta}`;
}

function buildBar(done, total, width) {
  const filled = Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function generateWhyWatch(movie) {
  const prompt = PROMPT
    .replace('{TITLE}', movie.title)
    .replace('{YEAR}', movie.year);

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      let raw = message.content[0].text;
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const parsed = JSON.parse(raw);

      if (!parsed.recommendation || !parsed.reasons || !parsed.context) {
        throw new Error('Missing required fields');
      }
      if (!['YES', 'NO'].includes(parsed.recommendation)) {
        throw new Error(`Invalid recommendation: ${parsed.recommendation}`);
      }

      const cost = (
        message.usage.input_tokens  * COST_INPUT_PER_M  / 1_000_000 +
        message.usage.output_tokens * COST_OUTPUT_PER_M / 1_000_000
      );

      return { success: true, parsed, cost };

    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS.length;
      if (isLastAttempt) return { success: false, error: error.message };

      const delay = error.status === 429
        ? RETRY_DELAYS[attempt] * 4
        : RETRY_DELAYS[attempt];
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function saveBatch(client, batch) {
  if (batch.length === 0) return;
  const values = batch.map((_, i) => {
    const b = i * 6;
    return `($${b+1}, $${b+2}, $${b+3}::jsonb, $${b+4}, $${b+5}, $${b+6})`;
  }).join(', ');
  const params = batch.flatMap(r => [
    r.tmdb_id, r.recommendation, JSON.stringify(r.reasons), r.context, MODEL, PROMPT_VERSION
  ]);
  await client.query(`
    INSERT INTO enhanced_why_watch_v3
      (tmdb_id, recommendation, reasons, context, model, prompt_version)
    VALUES ${values}
    ON CONFLICT (tmdb_id) DO NOTHING
  `, params);
}

async function main() {
  const limitArg = process.argv.indexOf('--limit');
  const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : null;

  const client = await pool.connect();

  try {
    const { rows: allMovies } = await client.query(`
      SELECT m.tmdb_id, m.title, m.year
      FROM movies m
      WHERE m.tmdb_id IS NOT NULL
        AND m.title IS NOT NULL
        AND m.year IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM enhanced_why_watch_v3 v WHERE v.tmdb_id = m.tmdb_id
        )
      ORDER BY m.tmdb_id
    `);

    const movies = LIMIT ? allMovies.slice(0, LIMIT) : allMovies;
    const total = movies.length;
    if (total === 0) { console.log('✅ All movies already have V3 data.'); return; }

    const { rows: [{ count: alreadyDone }] } = await client.query('SELECT COUNT(*) FROM enhanced_why_watch_v3');
    const grandTotal = total + parseInt(alreadyDone);

    console.log(`\n🎬 V3 WhyWatch Generation`);
    console.log(`   Model:       ${MODEL}`);
    console.log(`   Concurrency: ${CONCURRENCY} parallel requests`);
    console.log(`   Remaining:   ${allMovies.length.toLocaleString()} movies`);
    console.log(`   Done:        ${parseInt(alreadyDone).toLocaleString()} movies`);
    if (LIMIT) console.log(`   Limit:       ${LIMIT} (test batch)`);
    console.log(`   Processing:  ${total.toLocaleString()} movies this run`);
    console.log(`\nStarting in 3 seconds... Ctrl+C to stop safely.\n`);
    await new Promise(r => setTimeout(r, 3000));

    let done = parseInt(alreadyDone);
    let totalCost = 0;
    let failures = 0;
    let dbBatch = [];
    const startTime = Date.now();

    const heartbeat = setInterval(async () => {
      process.stdout.write(`\n💓 ${new Date().toISOString()} | ${formatProgress(done, grandTotal, totalCost, startTime)} | failures=${failures}\n`);
      // Keepalive ping to prevent Railway idle connection timeout (ECONNRESET)
      try { await client.query('SELECT 1'); } catch (_) {}
    }, HEARTBEAT_INTERVAL);

    process.on('SIGINT', async () => {
      clearInterval(heartbeat);
      process.stdout.write('\n\n⛔ Interrupted — flushing batch...\n');
      if (dbBatch.length > 0) {
        await saveBatch(client, dbBatch);
        process.stdout.write(`   Saved ${dbBatch.length} movies to DB.\n`);
      }
      process.stdout.write(`\n✅ Safe to exit. Resume by re-running the script.\n\n`);
      await pool.end();
      process.exit(0);
    });

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < movies.length; i += CONCURRENCY) {
      const chunk = movies.slice(i, i + CONCURRENCY);

      const results = await Promise.all(chunk.map(movie => generateWhyWatch(movie)));

      for (let j = 0; j < chunk.length; j++) {
        const movie = chunk[j];
        const result = results[j];

        if (result.success) {
          dbBatch.push({
            tmdb_id: movie.tmdb_id,
            recommendation: result.parsed.recommendation,
            reasons: result.parsed.reasons,
            context: result.parsed.context
          });
          totalCost += result.cost;
          done++;
        } else {
          logFailure(movie, result.error);
          failures++;
          done++;
        }
      }

      // Flush DB batch
      if (dbBatch.length >= DB_BATCH_SIZE) {
        await saveBatch(client, dbBatch);
        dbBatch = [];
      }

      process.stdout.write('\r' + formatProgress(done, grandTotal, totalCost, startTime).padEnd(100));
    }

    // Flush remaining
    if (dbBatch.length > 0) await saveBatch(client, dbBatch);

    clearInterval(heartbeat);

    const elapsed = formatDuration((Date.now() - startTime) / 1000);
    console.log(`\n\n✅ Generation complete`);
    console.log(`   Movies generated: ${movies.length - failures}`);
    console.log(`   Failures:         ${failures}${failures > 0 ? ` (see logs/v3-failures.log)` : ''}`);
    console.log(`   Total cost:       $${totalCost.toFixed(2)}`);
    console.log(`   Time:             ${elapsed}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
