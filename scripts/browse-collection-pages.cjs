#!/usr/bin/env node

/**
 * browse-collection-pages.cjs
 *
 * Generates editorial_data JSONB for browse_lists collections.
 *
 * Two-pass pipeline (default):
 *   Pass 1 — Sonnet:  selects subcategory names + movie title/year (no prose)
 *   Pass 2 — Haiku:   writes subtitle, subcategory descriptions, per-movie notes/tags
 *
 * Modes:
 *   --live     Real-time API calls with concurrency (default)
 *   --batch    Submit to Anthropic Batch API (cheaper, ~1hr turnaround)
 *   --process  Process completed batch results: --process <batch_id>
 *
 * Options:
 *   --limit N  Process only N collections (for test runs)
 *
 * Usage:
 *   node --env-file=.env.local scripts/browse-collection-pages.cjs --live --limit 10
 *   node --env-file=.env.local scripts/browse-collection-pages.cjs --batch
 *   node --env-file=.env.local scripts/browse-collection-pages.cjs --process msgbatch_xxx
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5';
const CONCURRENCY  = 10;
const COST_INPUT_PER_M        = { sonnet: 3.00,  haiku: 0.80  };
const COST_CACHE_WRITE_PER_M  = { sonnet: 3.75,  haiku: 1.00  };
const COST_CACHE_READ_PER_M   = { sonnet: 0.30,  haiku: 0.08  };
const COST_OUTPUT_PER_M       = { sonnet: 15.00, haiku: 4.00  };
const ERRORS_DIR = path.join(__dirname, '../logs/editorial-errors');

// ── Pass 1: Sonnet — movie selection only ─────────────────────────────────────
// Static system prompt is cached; only the collection title varies per call.

const SYSTEM_SONNET = `You are a film expert. When given a movie collection name, return a structured list of the most important and representative films for that collection.

Organize into 4-5 subcategories with 5-7 movies each.

Return as JSON only (no markdown, no explanation):
{
  "subcategories": [
    {
      "name": "subcategory name",
      "movies": [
        { "title": "...", "year": 1999 }
      ]
    }
  ]
}`;

const USER_SONNET = (title) =>
  `Give me a complete list of movies you'd call "${title}".`;

// ── Pass 2: Haiku — prose layer ───────────────────────────────────────────────
// Static system prompt is cached; only the movie list varies per call.

const SYSTEM_HAIKU = `You are writing editorial copy for movie collections. You will be given a collection name and a pre-selected list of movies organized into subcategories. Your job is to write the editorial prose only — do not add or remove any movies.

Return as JSON only (no markdown, no explanation):
{
  "subtitle": "one sentence framing what defines this category",
  "subcategories": [
    {
      "name": "exact subcategory name from above",
      "description": "one sentence about this subcategory",
      "movies": [
        { "title": "exact title from above", "year": 1999, "note": "one specific sentence about why it fits", "tags": ["tag1", "tag2"] }
      ]
    }
  ]
}

Rules:
- Use the exact subcategory names and movie titles/years provided
- Do not add or remove any movies
- Notes should be specific (not generic praise)
- 2-3 tags per movie (mood, theme, or style descriptors)`;

const USER_HAIKU = (collectionTitle, subcategories) => {
  const movieList = subcategories.map(sub =>
    `${sub.name}:\n${sub.movies.map(m => `  - ${m.title} (${m.year})`).join('\n')}`
  ).join('\n\n');

  return `Write editorial copy for the collection "${collectionTitle}".\n\n${movieList}`;
};

// ── Validation ────────────────────────────────────────────────────────────────

function validateSonnet(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'response is not an object';
  if (!Array.isArray(parsed.subcategories))
    return 'subcategories is not an array';
  if (parsed.subcategories.length < 2 || parsed.subcategories.length > 5)
    return `subcategories count ${parsed.subcategories.length} not in 2–5 range`;
  for (let i = 0; i < parsed.subcategories.length; i++) {
    const sub = parsed.subcategories[i];
    if (!sub.name || typeof sub.name !== 'string' || !sub.name.trim())
      return `subcategory[${i}] missing name`;
    if (!Array.isArray(sub.movies) || sub.movies.length < 3)
      return `subcategory[${i}] "${sub.name}" has ${(sub.movies||[]).length} movies (need ≥3)`;
    for (let j = 0; j < sub.movies.length; j++) {
      const m = sub.movies[j];
      if (!m.title || typeof m.title !== 'string' || !m.title.trim())
        return `subcategory[${i}] movie[${j}] missing title`;
      if (typeof m.year !== 'number' || isNaN(m.year))
        return `subcategory[${i}] movie[${j}] "${m.title}" missing numeric year`;
    }
  }
  return null;
}

function validateHaiku(parsed, sonnetSubs) {
  if (!parsed || typeof parsed !== 'object') return 'response is not an object';
  if (!parsed.subtitle || typeof parsed.subtitle !== 'string' || !parsed.subtitle.trim())
    return 'missing or empty subtitle';
  if (!Array.isArray(parsed.subcategories))
    return 'subcategories is not an array';
  if (parsed.subcategories.length !== sonnetSubs.length)
    return `subcategories count mismatch: got ${parsed.subcategories.length}, expected ${sonnetSubs.length}`;
  for (let i = 0; i < parsed.subcategories.length; i++) {
    const sub = parsed.subcategories[i];
    if (!sub.name || typeof sub.name !== 'string' || !sub.name.trim())
      return `subcategory[${i}] missing name`;
    if (!sub.description || typeof sub.description !== 'string' || !sub.description.trim())
      return `subcategory[${i}] missing description`;
    if (!Array.isArray(sub.movies) || sub.movies.length < 3)
      return `subcategory[${i}] "${sub.name}" has ${(sub.movies||[]).length} movies (need ≥3)`;
    for (let j = 0; j < sub.movies.length; j++) {
      const m = sub.movies[j];
      if (!m.title || typeof m.title !== 'string' || !m.title.trim())
        return `subcategory[${i}] movie[${j}] missing title`;
      if (typeof m.year !== 'number' || isNaN(m.year))
        return `subcategory[${i}] movie[${j}] "${m.title}" missing numeric year`;
      if (!m.note || typeof m.note !== 'string' || !m.note.trim())
        return `subcategory[${i}] movie[${j}] "${m.title}" missing note`;
    }
  }
  return null;
}

// ── tmdb_id resolution ───────────────────────────────────────────────────────

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;

async function lookupMovie(client, title, year) {
  // 1. DB: exact title match, year ±5, pick closest
  const { rows } = await client.query(
    `SELECT tmdb_id FROM movies
     WHERE LOWER(title) = LOWER($1)
       AND year BETWEEN $2-5 AND $2+5
       AND tmdb_id IS NOT NULL
     ORDER BY ABS(year - $2)
     LIMIT 1`,
    [title, year]
  );
  if (rows.length) return rows[0].tmdb_id;

  // 2. TMDB fallback: search by title, pick result with year closest to target
  if (TMDB_KEY) {
    try {
      const r = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`
      );
      const d = await r.json();
      const results = (d.results || []).filter(m => m.id && m.release_date);
      if (results.length) {
        results.sort((a, b) =>
          Math.abs(parseInt(a.release_date) - year) - Math.abs(parseInt(b.release_date) - year)
        );
        return results[0].id;
      }
    } catch (_) {}
  }

  return null;
}

async function resolveMovies(client, subcategories) {
  let matched = 0, total = 0;
  const resolved = [];
  for (const sub of subcategories) {
    const movies = [];
    for (const m of sub.movies) {
      total++;
      const tmdb_id = await lookupMovie(client, m.title, m.year);
      if (tmdb_id != null) {
        movies.push({ ...m, tmdb_id });
        matched++;
      } else {
        process.stderr.write(`  NO MATCH: "${m.title}" (${m.year})\n`);
      }
    }
    if (movies.length > 0) {
      resolved.push({ ...sub, movies });
    }
  }
  return { resolved, matched, total };
}

// ── Error logging ────────────────────────────────────────────────────────────

function writeError(id, title, reason, raw) {
  fs.mkdirSync(ERRORS_DIR, { recursive: true });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const file = path.join(ERRORS_DIR, `${id}-${slug}.json`);
  fs.writeFileSync(file, JSON.stringify({ id, title, reason, raw }, null, 2));
}

// ── Parse raw Claude output ──────────────────────────────────────────────────

function parseResponse(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

// ── Cost helper ───────────────────────────────────────────────────────────────

function calcCost(usage, model) {
  const key = model.includes('haiku') ? 'haiku' : 'sonnet';
  const cacheWrite = (usage.cache_creation_input_tokens || 0) * COST_CACHE_WRITE_PER_M[key] / 1_000_000;
  const cacheRead  = (usage.cache_read_input_tokens     || 0) * COST_CACHE_READ_PER_M[key]  / 1_000_000;
  const input      = usage.input_tokens                       * COST_INPUT_PER_M[key]        / 1_000_000;
  const output     = usage.output_tokens                      * COST_OUTPUT_PER_M[key]       / 1_000_000;
  return cacheWrite + cacheRead + input + output;
}

// ── LIVE mode (two-pass) ─────────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function runLive(collections) {
  const client = await pool.connect();
  let done = 0, passed = 0, failed = 0, totalMatched = 0, totalMovies = 0, totalCost = 0;
  const startTime = Date.now();
  const total = collections.length;

  async function processOne(row) {
    let cost = 0;

    // ── Pass 1: Sonnet — movie selection ──
    const msg1 = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_SONNET, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: USER_SONNET(row.revised_title) }]
    });
    cost += calcCost(msg1.usage, MODEL_SONNET);

    let pass1;
    try {
      pass1 = parseResponse(msg1.content[0].text);
    } catch (e) {
      writeError(row.id, row.revised_title, `Pass1 JSON parse error: ${e.message}`, msg1.content[0].text);
      return { cost, ok: false, matched: 0, total: 0 };
    }

    const err1 = validateSonnet(pass1);
    if (err1) {
      writeError(row.id, row.revised_title, `Pass1 validation: ${err1}`, msg1.content[0].text);
      return { cost, ok: false, matched: 0, total: 0 };
    }

    // ── Pass 2: Haiku — prose ──
    const msg2 = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 8192,
      system: [{ type: 'text', text: SYSTEM_HAIKU, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: USER_HAIKU(row.revised_title, pass1.subcategories) }]
    });
    cost += calcCost(msg2.usage, MODEL_HAIKU);

    let pass2;
    try {
      pass2 = parseResponse(msg2.content[0].text);
    } catch (e) {
      writeError(row.id, row.revised_title, `Pass2 JSON parse error: ${e.message}`, msg2.content[0].text);
      return { cost, ok: false, matched: 0, total: 0 };
    }

    const err2 = validateHaiku(pass2, pass1.subcategories);
    if (err2) {
      writeError(row.id, row.revised_title, `Pass2 validation: ${err2}`, msg2.content[0].text);
      return { cost, ok: false, matched: 0, total: 0 };
    }

    // ── Resolve tmdb_ids ──
    const { resolved, matched, total: movieTotal } = await resolveMovies(client, pass2.subcategories);

    const editorial = {
      subtitle: pass2.subtitle,
      subcategories: resolved
    };

    await client.query(
      `UPDATE browse_lists SET editorial_data = $1 WHERE id = $2`,
      [JSON.stringify(editorial), row.id]
    );

    return { cost, ok: true, matched, total: movieTotal };
  }

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < collections.length; i += CONCURRENCY) {
    const chunk = collections.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(row => processOne(row)));

    for (const result of results) {
      done++;
      if (result.status === 'rejected') {
        failed++;
        process.stderr.write(`\nError: ${result.reason.message}\n`);
      } else {
        const { cost, ok, matched, total: mt } = result.value;
        totalCost += cost;
        if (ok) { passed++; totalMatched += matched; totalMovies += mt; }
        else failed++;
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? (done / elapsed * 60).toFixed(0) : '0';
    const remaining = done > 0 ? Math.round((total - done) / (done / elapsed)) : 0;
    const eta = remaining > 0 ? formatDuration(remaining) : '--';
    const pct = ((done / total) * 100).toFixed(1);
    const matchRate = totalMovies > 0 ? ((totalMatched / totalMovies) * 100).toFixed(0) : '--';

    process.stdout.write(
      `\r[${done}/${total}] ${pct}% | ${rate}/min | $${totalCost.toFixed(2)} | passed=${passed} failed=${failed} match=${matchRate}%`.padEnd(100)
    );
  }

  client.release();

  const elapsed = formatDuration((Date.now() - startTime) / 1000);
  console.log(`\n\n✅ Done`);
  console.log(`   Passed:     ${passed}`);
  console.log(`   Failed:     ${failed}`);
  console.log(`   Match rate: ${totalMovies > 0 ? ((totalMatched / totalMovies) * 100).toFixed(1) : '--'}% (${totalMatched}/${totalMovies} movies resolved)`);
  console.log(`   Cost:       $${totalCost.toFixed(2)}`);
  console.log(`   Time:       ${elapsed}`);
  if (failed > 0) console.log(`   Errors:     logs/editorial-errors/`);
}

// ── BATCH submit mode ────────────────────────────────────────────────────────

async function runBatchSubmit(collections) {
  console.log(`\nBuilding batch of ${collections.length} requests...`);

  const requests = collections.map(row => ({
    custom_id: row.id,
    params: {
      model: MODEL_SONNET,
      max_tokens: 4096,
      messages: [{ role: 'user', content: PROMPT_SONNET(row.revised_title) }]
    }
  }));

  const batch = await anthropic.beta.messages.batches.create({ requests });

  const batchIdFile = path.join(__dirname, '../logs/editorial-batch-id.txt');
  fs.writeFileSync(batchIdFile, batch.id);

  const estimatedCost = collections.length * 700 * COST_OUTPUT_PER_M.sonnet / 1_000_000 * 0.5;
  console.log(`✅ Batch submitted: ${batch.id}`);
  console.log(`   Collections:    ${collections.length}`);
  console.log(`   Est. cost:      ~$${estimatedCost.toFixed(0)} (batch pricing, Pass 1 only)`);
  console.log(`   Saved to:       logs/editorial-batch-id.txt`);
  console.log(`\nWhen complete, run:`);
  console.log(`   node --env-file=.env.local scripts/browse-collection-pages.cjs --process ${batch.id}`);
}

// ── BATCH process mode ───────────────────────────────────────────────────────

async function runBatchProcess(batchId) {
  console.log(`\nProcessing batch: ${batchId}`);

  // Poll until complete
  let batch;
  while (true) {
    batch = await anthropic.beta.messages.batches.retrieve(batchId);
    if (batch.processing_status === 'ended') break;
    console.log(`  Status: ${batch.processing_status} — waiting 30s...`);
    await new Promise(r => setTimeout(r, 30000));
  }

  console.log(`Batch complete. Processing results...\n`);

  const client = await pool.connect();
  let passed = 0, failed = 0, totalMatched = 0, totalMovies = 0;
  const retryQueue = [];

  for await (const result of await anthropic.beta.messages.batches.results(batchId)) {
    const id = result.custom_id;

    const { rows: [row] } = await client.query(
      `SELECT revised_title FROM browse_lists WHERE id = $1`, [id]
    );
    const title = row?.revised_title || id;

    if (result.result.type !== 'succeeded') {
      console.log(`\n  RETRY queued (${result.result.type}): ${title}`);
      retryQueue.push({ id, revised_title: title });
      failed++;
      continue;
    }

    // Pass 1 result from batch
    let pass1;
    try {
      pass1 = parseResponse(result.result.message.content[0].text);
    } catch (e) {
      writeError(id, title, `Pass1 JSON parse error: ${e.message}`, result.result.message.content[0].text);
      failed++;
      continue;
    }

    const err1 = validateSonnet(pass1);
    if (err1) {
      writeError(id, title, `Pass1 validation: ${err1}`, result.result.message.content[0].text);
      failed++;
      continue;
    }

    // Pass 2: Haiku prose (live, since batch only ran Pass 1)
    try {
      const msg2 = await anthropic.messages.create({
        model: MODEL_HAIKU,
        max_tokens: 8192,
        system: [{ type: 'text', text: SYSTEM_HAIKU, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: USER_HAIKU(title, pass1.subcategories) }]
      });

      let pass2;
      try {
        pass2 = parseResponse(msg2.content[0].text);
      } catch (e) {
        writeError(id, title, `Pass2 JSON parse error: ${e.message}`, msg2.content[0].text);
        failed++;
        continue;
      }

      const err2 = validateHaiku(pass2, pass1.subcategories);
      if (err2) {
        writeError(id, title, `Pass2 validation: ${err2}`, msg2.content[0].text);
        failed++;
        continue;
      }

      const { resolved, matched, total: movieTotal } = await resolveMovies(client, pass2.subcategories);
      totalMatched += matched;
      totalMovies += movieTotal;

      await client.query(
        `UPDATE browse_lists SET editorial_data = $1 WHERE id = $2`,
        [JSON.stringify({ subtitle: pass2.subtitle, subcategories: resolved }), id]
      );
      passed++;
    } catch (e) {
      writeError(id, title, `Pass2 API error: ${e.message}`, null);
      failed++;
      continue;
    }

    process.stdout.write(`\r  processed ${passed + failed} | passed=${passed} failed=${failed}`);
  }

  // ── Live retry for API-side errored results ──────────────────────────────
  if (retryQueue.length > 0) {
    console.log(`\n\nRetrying ${retryQueue.length} API-errored items via live two-pass...`);
    let retryPassed = 0, retryFailed = 0;

    for (let i = 0; i < retryQueue.length; i += CONCURRENCY) {
      const chunk = retryQueue.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(chunk.map(async (row) => {
        const msg1 = await anthropic.messages.create({
          model: MODEL_SONNET,
          max_tokens: 4096,
          system: [{ type: 'text', text: SYSTEM_SONNET, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: USER_SONNET(row.revised_title) }]
        });
        let pass1;
        try { pass1 = parseResponse(msg1.content[0].text); }
        catch (e) { writeError(row.id, row.revised_title, `Pass1 parse: ${e.message}`, msg1.content[0].text); return { ok: false }; }
        const err1 = validateSonnet(pass1);
        if (err1) { writeError(row.id, row.revised_title, `Pass1 validation: ${err1}`, msg1.content[0].text); return { ok: false }; }

        const msg2 = await anthropic.messages.create({
          model: MODEL_HAIKU,
          max_tokens: 8192,
          system: [{ type: 'text', text: SYSTEM_HAIKU, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: USER_HAIKU(row.revised_title, pass1.subcategories) }]
        });
        let pass2;
        try { pass2 = parseResponse(msg2.content[0].text); }
        catch (e) { writeError(row.id, row.revised_title, `Pass2 parse: ${e.message}`, msg2.content[0].text); return { ok: false }; }
        const err2 = validateHaiku(pass2, pass1.subcategories);
        if (err2) { writeError(row.id, row.revised_title, `Pass2 validation: ${err2}`, msg2.content[0].text); return { ok: false }; }

        const { resolved, matched, total: movieTotal } = await resolveMovies(client, pass2.subcategories);
        await client.query(
          `UPDATE browse_lists SET editorial_data = $1 WHERE id = $2`,
          [JSON.stringify({ subtitle: pass2.subtitle, subcategories: resolved }), row.id]
        );
        return { ok: true, matched, total: movieTotal };
      }));

      for (const r of results) {
        if (r.status === 'rejected') {
          retryFailed++;
          process.stderr.write(`\n  Retry error: ${r.reason?.message}\n`);
        } else if (r.value.ok) {
          retryPassed++;
          passed++;
          failed--;
          totalMatched += r.value.matched;
          totalMovies  += r.value.total;
        } else {
          retryFailed++;
        }
      }
      process.stdout.write(`\r  retried ${retryPassed + retryFailed}/${retryQueue.length} | passed=${retryPassed} failed=${retryFailed}`);
    }
    console.log(`\n  Retry complete: ${retryPassed} recovered, ${retryFailed} still failed`);
  }

  client.release();

  const remaining = fs.existsSync(ERRORS_DIR)
    ? fs.readdirSync(ERRORS_DIR).filter(f => f.endsWith('.json')).length
    : 0;

  console.log(`\n\n✅ Batch processing complete`);
  console.log(`   Passed:     ${passed}`);
  console.log(`   Failed:     ${failed}`);
  console.log(`   Match rate: ${totalMovies > 0 ? ((totalMatched / totalMovies) * 100).toFixed(1) : '--'}% (${totalMatched}/${totalMovies} movies resolved)`);
  if (remaining > 0) console.log(`   Unresolved: ${remaining} — see logs/editorial-errors/`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
  const processIdx = args.indexOf('--process');
  const batchId = processIdx !== -1 ? args[processIdx + 1] : null;
  const isBatch = args.includes('--batch');

  if (batchId) {
    await runBatchProcess(batchId);
    await pool.end();
    return;
  }

  const client = await pool.connect();
  const { rows: allPending } = await client.query(`
    SELECT id, revised_title
    FROM browse_lists
    WHERE total_movies >= 8
      AND curation_action != 'merged'
      AND editorial_data IS NULL
    ORDER BY id
  `);
  client.release();

  const collections = limit ? allPending.slice(0, limit) : allPending;

  if (collections.length === 0) {
    console.log('✅ All collections already have editorial_data.');
    await pool.end();
    return;
  }

  console.log(`\n📚 Browse Collection Pages`);
  console.log(`   Mode:       ${isBatch ? 'BATCH' : 'LIVE'}`);
  console.log(`   Models:     ${MODEL_SONNET} → ${MODEL_HAIKU}`);
  console.log(`   Pending:    ${collections.length.toLocaleString()} collections`);
  if (limit) console.log(`   Limit:      ${limit}`);
  console.log();

  if (isBatch) {
    await runBatchSubmit(collections);
  } else {
    await runLive(collections);
  }

  await pool.end();
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
