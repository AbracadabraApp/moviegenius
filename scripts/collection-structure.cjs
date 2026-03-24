#!/usr/bin/env node

/**
 * collection-structure.cjs
 *
 * Pass 1: Generate subcategory structure + movie list for browse collections.
 * Saves to browse_lists.editorial_data as JSON, with null fields for Pass 2 (descriptions).
 *
 * Output shape:
 * {
 *   "subtitle": null,
 *   "subcategories": [
 *     {
 *       "name": "...",
 *       "description": null,
 *       "movies": [
 *         { "title": "...", "year": 1999, "note": null }
 *       ]
 *     }
 *   ]
 * }
 *
 * Usage:
 *   node --env-file=.env.local scripts/collection-structure.cjs --dry-run --limit 3
 *   node --env-file=.env.local scripts/collection-structure.cjs --limit 3
 *   node --env-file=.env.local scripts/collection-structure.cjs
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MODEL = 'claude-sonnet-4-6';
const CONCURRENCY = 10;
const COST_INPUT_PER_M       = 3.00;
const COST_CACHE_WRITE_PER_M = 3.75;
const COST_CACHE_READ_PER_M  = 0.30;
const COST_OUTPUT_PER_M      = 15.00;

// ── Cached system prompt ──────────────────────────────────────────────────────
// This is identical for every call — Anthropic caches it after the first request.

const SYSTEM = `You are a film expert. Given a movie collection name, return the most important and representative films organized into subcategories.

Rules:
- 4-5 subcategories
- 5-8 movies per subcategory
- Each movie may appear only once in the entire response — no movie can appear in more than one subcategory
- Movies must actually exist and fit the collection
- If a film has been remade, always use the original version and its correct release year
- Return JSON only, no markdown, no explanation

Output format:
{
  "subcategories": [
    {
      "name": "subcategory name",
      "movies": [
        { "title": "exact movie title", "year": 1999 }
      ]
    }
  ]
}`;

function userPrompt(title) {
  return `List the best movies for the collection: "${title}"`;
}

function calcCost(usage) {
  return (
    ((usage.cache_creation_input_tokens || 0) * COST_CACHE_WRITE_PER_M / 1e6) +
    ((usage.cache_read_input_tokens     || 0) * COST_CACHE_READ_PER_M  / 1e6) +
    (usage.input_tokens                       * COST_INPUT_PER_M       / 1e6) +
    (usage.output_tokens                      * COST_OUTPUT_PER_M      / 1e6)
  );
}

// Returns { error, warnings } — error is a hard fail (unusable response),
// warnings are logged but we still save the data.
function validate(parsed) {
  if (!parsed || !Array.isArray(parsed.subcategories))
    return { error: 'subcategories missing', warnings: [] };
  if (parsed.subcategories.length === 0)
    return { error: 'no subcategories returned', warnings: [] };
  // No count enforcement — use whatever Claude returns

  const warnings = [];
  for (const sub of parsed.subcategories) {
    if (!sub.name) { warnings.push('subcategory missing name'); continue; }
    const movies = Array.isArray(sub.movies) ? sub.movies : [];
    // Filter to movies with at least a title
    sub.movies = movies.filter(m => m.title);
    const missing = movies.length - sub.movies.length;
    if (missing > 0) warnings.push(`"${sub.name}": ${missing} movie(s) missing title, skipped`);
    if (sub.movies.length === 0) warnings.push(`"${sub.name}": no valid movies`);
  }
  return { error: null, warnings };
}

async function resolveTmdbIds(client, allMovies) {
  // Pass 1: exact (title, year) match
  const pairs = allMovies.map(m => `('${m.title.replace(/'/g, "''")}', ${m.year})`).join(', ');
  const { rows: exactRows } = await client.query(
    `SELECT tmdb_id, title, year FROM movies WHERE (title, year) IN (${pairs})`
  );
  const map = {};
  for (const row of exactRows) {
    map[`${row.title}|${row.year}`] = row.tmdb_id;
  }

  // Pass 2: fuzzy fallback for unmatched — case-insensitive title, year ±5
  const unmatched = allMovies.filter(m => !map[`${m.title}|${m.year}`]);
  if (unmatched.length > 0) {
    const fuzzyConditions = unmatched.map(
      m => `(LOWER(title) = LOWER('${m.title.replace(/'/g, "''")}') AND year BETWEEN ${m.year - 5} AND ${m.year + 5})`
    ).join(' OR ');
    const { rows: fuzzyRows } = await client.query(
      `SELECT tmdb_id, title, year FROM movies WHERE ${fuzzyConditions}`
    );
    for (const m of unmatched) {
      const candidates = fuzzyRows.filter(
        r => r.title.toLowerCase() === m.title.toLowerCase()
      );
      if (candidates.length > 0) {
        candidates.sort((a, b) => Math.abs(a.year - m.year) - Math.abs(b.year - m.year));
        map[`${m.title}|${m.year}`] = candidates[0].tmdb_id;
      }
    }
  }

  // Pass 3: substring fallback — find longest word (4+ chars) in title, match via ILIKE, year ±5
  const stillUnmatched = allMovies.filter(m => !map[`${m.title}|${m.year}`]);
  if (stillUnmatched.length > 0) {
    for (const m of stillUnmatched) {
      const words = m.title.split(/\s+/).filter(w => w.length >= 4);
      if (words.length === 0) continue;
      // Use the longest word as the keyword
      const keyword = words.sort((a, b) => b.length - a.length)[0].replace(/'/g, "''");
      const { rows: subRows } = await client.query(
        `SELECT tmdb_id, title, year FROM movies
         WHERE title ILIKE $1 AND year BETWEEN $2 AND $3
         ORDER BY ABS(year - $4) LIMIT 3`,
        [`%${keyword}%`, m.year - 5, m.year + 5, m.year]
      );
      if (subRows.length > 0) {
        map[`${m.title}|${m.year}`] = subRows[0].tmdb_id;
      }
    }
  }

  // Pass 4: TMDB API fallback for anything still unmatched
  // TMDB_BEARER_TOKEN = v4 read access token (Bearer auth)
  // NEXT_PUBLIC_TMDB_API_KEY = v3 API key (query param auth)
  const tmdbBearer = process.env.TMDB_BEARER_TOKEN;
  const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const finalUnmatched = allMovies.filter(m => !map[`${m.title}|${m.year}`]);
  if (finalUnmatched.length > 0 && (tmdbBearer || tmdbApiKey)) {
    for (const m of finalUnmatched) {
      try {
        const baseUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(m.title)}&language=en-US&page=1`;
        const url = tmdbApiKey ? `${baseUrl}&api_key=${tmdbApiKey}` : baseUrl;
        const headers = tmdbBearer ? { Authorization: `Bearer ${tmdbBearer}` } : {};
        const res = await fetch(url, { headers });
        if (!res.ok) continue;
        const data = await res.json();
        const results = data.results || [];
        // Accept match if release year within ±5
        const match = results.find(r => {
          const releaseYear = r.release_date ? parseInt(r.release_date.slice(0, 4)) : 0;
          return Math.abs(releaseYear - m.year) <= 5;
        });
        if (match) {
          map[`${m.title}|${m.year}`] = match.id;
        }
      } catch (_) { /* skip on error */ }
    }
  }

  return map;
}

function toEditorialData(parsed, tmdbMap) {
  return {
    subtitle: null,
    subcategories: parsed.subcategories.map(sub => ({
      name: sub.name,
      description: null,
      movies: sub.movies.map(m => ({
        title: m.title,
        year: m.year,
        tmdb_id: tmdbMap[`${m.title}|${m.year}`] || null,
        note: null
      }))
    }))
  };
}

async function processOne(title, client) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt(title) }]
  });

  const raw = msg.content[0].text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const parsed = JSON.parse(raw);
  const { error, warnings } = validate(parsed);
  if (error) throw new Error(error);

  // Flatten all movies for batch TMDB lookup
  const allMovies = parsed.subcategories.flatMap(sub => sub.movies);
  const tmdbMap = await resolveTmdbIds(client, allMovies);

  // Count matches for reporting
  const matched = allMovies.filter(m => tmdbMap[`${m.title}|${m.year}`]).length;
  const matchRate = allMovies.length > 0 ? Math.round(matched / allMovies.length * 100) : 0;

  return {
    data: toEditorialData(parsed, tmdbMap),
    cost: calcCost(msg.usage),
    usage: msg.usage,
    matched,
    total: allMovies.length,
    matchRate,
    warnings
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;

  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, COALESCE(revised_title, title) AS title
      FROM browse_lists
      WHERE status = 'active'
        AND editorial_data IS NULL
      ORDER BY total_movies DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `);

    const total = rows.length;
    if (total === 0) { console.log('Nothing to process.'); return; }

    console.log(`\n📚 Collection Structure Generator`);
    console.log(`   Model:    ${MODEL}`);
    console.log(`   Mode:     ${dryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
    console.log(`   Pending:  ${total} collections\n`);

    let done = 0;
    let totalCost = 0;
    let passed = 0;
    let failed = 0;
    const startTime = Date.now();

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        chunk.map(row => processOne(row.title, client))
      );

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const result = results[j];
        done++;

        if (result.status === 'fulfilled') {
          const { data, cost, usage, matched, total, matchRate, warnings } = result.value;
          totalCost += cost;
          passed++;

          if (dryRun) {
            console.log(`\n✓ ${row.title}`);
            console.log(`  cache_write=${usage.cache_creation_input_tokens || 0} cache_read=${usage.cache_read_input_tokens || 0} in=${usage.input_tokens} out=${usage.output_tokens} cost=$${cost.toFixed(5)}`);
            console.log(`  tmdb_match=${matched}/${total} (${matchRate}%)`);
            if (warnings.length > 0) {
              for (const w of warnings) console.log(`  ⚠ ${w}`);
            }
            for (const sub of data.subcategories) {
              console.log(`  [${sub.name}] (${sub.movies.length} movies)`);
              for (const m of sub.movies) {
                const idStr = m.tmdb_id ? `id=${m.tmdb_id}` : 'NO MATCH';
                console.log(`    - ${m.title} (${m.year}) [${idStr}]`);
              }
            }
          } else {
            if (warnings.length > 0) {
              console.log(`\n⚠ ${row.title}`);
              for (const w of warnings) console.log(`  ${w}`);
            }
            await client.query(
              `UPDATE browse_lists SET editorial_data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify(data), row.id]
            );
          }
        } else {
          failed++;
          console.log(`\n✗ ${row.title}: ${result.reason.message}`);
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const rate = done > 0 ? (done / elapsed * 60).toFixed(0) : 0;
        process.stdout.write(
          `\r[${done}/${total}] ${rate}/min | $${totalCost.toFixed(3)} | passed=${passed} failed=${failed}`.padEnd(80)
        );
      }
    }

    console.log(`\n\n${dryRun ? '🔍 Dry run complete' : '✅ Done'}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Cost:   $${totalCost.toFixed(3)}`);
    if (!dryRun && passed > 0) {
      console.log(`   Saved to browse_lists.editorial_data`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
