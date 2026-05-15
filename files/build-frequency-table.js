#!/usr/bin/env node
/**
 * scripts/build-frequency-table.js
 *
 * Builds the more_ideas_frequency table and classifies each row by catalog
 * status. See TASK_frequency_histogram.md for the full spec.
 *
 * This is a reference implementation showing the observability pattern.
 * Adjust SQL and paths to match the actual MovieGenius codebase.
 *
 * Usage:
 *   node scripts/build-frequency-table.js
 *   node scripts/build-frequency-table.js --resume
 *   node scripts/build-frequency-table.js | tee logs/freq-$(date +%s).log
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { normalizeTitle } from '../lib/search-matching.js';

const { Pool } = pg;

// ---------- Config ----------
const BATCH_SIZE = 5000;
const CHECKPOINT_DIR = 'checkpoints/frequency';
const OUTPUT_DIR = 'output';
const CUTOFF_DATE = null; // null = analyze all records
const ERROR_RATE_ABORT_THRESHOLD = 0.01; // abort if >1% rows error

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('FATAL: DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  process.exit(1);
}
const pool = new Pool({ connectionString: dbUrl });

const resume = process.argv.includes('--resume');

// ---------- Logging helpers ----------
function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function log(msg) {
  process.stdout.write(`[${ts()}] ${msg}\n`);
}
function warn(msg) {
  process.stdout.write(`[${ts()}] WARN ${msg}\n`);
}

// Wrap a long query with a heartbeat so the operator knows it's not hung.
async function queryWithHeartbeat(client, sql, params, label, expectedSeconds) {
  log(`Running ${label} (expected ${expectedSeconds}s)...`);
  const start = Date.now();
  let elapsed = 0;
  const heartbeat = setInterval(() => {
    elapsed = Math.round((Date.now() - start) / 1000);
    log(`  still waiting on ${label}... (${elapsed}s elapsed)`);
  }, 10000);

  try {
    const result = await client.query(sql, params);
    clearInterval(heartbeat);
    const totalSec = ((Date.now() - start) / 1000).toFixed(1);
    log(`${label} complete — ${result.rowCount ?? result.rows.length} rows in ${totalSec}s`);
    return result;
  } catch (err) {
    clearInterval(heartbeat);
    throw err;
  }
}

// Rolling-window ETA from the last N batch durations.
class EtaTracker {
  constructor(totalBatches, windowSize = 3) {
    this.totalBatches = totalBatches;
    this.windowSize = windowSize;
    this.recentDurations = [];
  }
  recordBatch(durationMs) {
    this.recentDurations.push(durationMs);
    if (this.recentDurations.length > this.windowSize) {
      this.recentDurations.shift();
    }
  }
  etaString(completedBatches) {
    if (this.recentDurations.length === 0) return 'unknown';
    const avgMs = this.recentDurations.reduce((a, b) => a + b, 0) / this.recentDurations.length;
    const remaining = this.totalBatches - completedBatches;
    const etaMs = Date.now() + (remaining * avgMs);
    return new Date(etaMs).toISOString().slice(11, 19);
  }
}

// ---------- Checkpoint helpers ----------
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadStepCheckpoint() {
  try {
    const content = await fs.readFile(
      path.join(CHECKPOINT_DIR, 'progress.json'),
      'utf8'
    );
    return JSON.parse(content);
  } catch {
    return { completedSteps: [], lastBatch: null };
  }
}

async function writeStepCheckpoint(stepName, state = {}) {
  const current = await loadStepCheckpoint();
  if (!current.completedSteps.includes(stepName)) {
    current.completedSteps.push(stepName);
  }
  current.lastUpdate = new Date().toISOString();
  Object.assign(current, state);
  await fs.writeFile(
    path.join(CHECKPOINT_DIR, 'progress.json'),
    JSON.stringify(current, null, 2)
  );
  log(`Checkpoint: ${stepName} marked complete`);
}

async function loadLastCheckpoint() {
  try {
    const files = await fs.readdir(CHECKPOINT_DIR);
    const batchFiles = files
      .filter(f => f.startsWith('batch_') && f.endsWith('.json'))
      .map(f => parseInt(f.match(/batch_(\d+)/)[1], 10))
      .sort((a, b) => b - a);
    if (batchFiles.length === 0) return null;
    const last = batchFiles[0];
    const content = await fs.readFile(
      path.join(CHECKPOINT_DIR, `batch_${String(last).padStart(4, '0')}.json`),
      'utf8'
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeCheckpoint(batchNum, state) {
  const filename = path.join(
    CHECKPOINT_DIR,
    `batch_${String(batchNum).padStart(4, '0')}.json`
  );
  await fs.writeFile(filename, JSON.stringify(state, null, 2));
}

// ---------- Step 1: build the frequency table ----------
async function buildFrequencyTable(client) {
  log('=== Step 1: Build more_ideas_frequency table ===');

  // Check if already built (for resumability)
  const existing = await client.query(`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_name = 'more_ideas_frequency'
  `);
  if (parseInt(existing.rows[0].n, 10) > 0) {
    log('Table already exists — skipping creation');
    await writeStepCheckpoint('build_frequency_table');
    return;
  }

  const whereClause = CUTOFF_DATE
    ? `WHERE created_at < '${CUTOFF_DATE}'::date AND idea->>'title' IS NOT NULL`
    : `WHERE idea->>'title' IS NOT NULL`;

  await queryWithHeartbeat(client, `
    CREATE TABLE more_ideas_frequency AS
    SELECT
      (idea->>'title')::text AS title,
      (idea->>'year')::integer AS year,
      COUNT(*) AS recommendation_count,
      COUNT(DISTINCT more_ideas.id) AS distinct_source_count
    FROM more_ideas,
         jsonb_array_elements(ideas) AS idea
    ${whereClause}
    GROUP BY title, year
    ORDER BY recommendation_count DESC
  `, [], 'table creation', 60);

  log('Adding columns and indexes...');
  await client.query(`ALTER TABLE more_ideas_frequency ADD COLUMN title_normalized TEXT`);
  await client.query(`ALTER TABLE more_ideas_frequency ADD COLUMN catalog_status TEXT`);
  await client.query(`CREATE INDEX idx_mif_count ON more_ideas_frequency (recommendation_count DESC)`);
  await client.query(`CREATE INDEX idx_mif_title_year ON more_ideas_frequency (title, year)`);
  await client.query(`CREATE INDEX idx_mif_normalized ON more_ideas_frequency (title_normalized)`);

  const count = await client.query(`SELECT COUNT(*) AS n FROM more_ideas_frequency`);
  log(`Created more_ideas_frequency with ${count.rows[0].n} unique (title, year) pairs`);

  await writeStepCheckpoint('build_frequency_table');
}

// ---------- Step 2: backfill title_normalized in batches ----------
async function backfillNormalized(client) {
  log('=== Step 2: Backfill title_normalized ===');

  const totalResult = await client.query(`
    SELECT COUNT(*) AS n FROM more_ideas_frequency WHERE title_normalized IS NULL
  `);
  const total = parseInt(totalResult.rows[0].n, 10);

  if (total === 0) {
    log('All rows already normalized — skipping');
    return;
  }

  const totalBatches = Math.ceil(total / BATCH_SIZE);
  log(`Rows to normalize: ${total}`);
  log(`Batch size: ${BATCH_SIZE}`);
  log(`Estimated batches: ${totalBatches}`);

  const eta = new EtaTracker(totalBatches);
  let processed = 0;
  let errors = 0;
  let startBatch = 0;

  if (resume) {
    const last = await loadLastCheckpoint();
    if (last) {
      startBatch = last.batch;
      processed = last.processed;
      log(`Resuming from batch ${startBatch} (${processed} rows already processed)`);
    }
  }

  for (let batch = startBatch; batch < totalBatches; batch++) {
    const batchStart = Date.now();

    const rows = await client.query(`
      SELECT title, year FROM more_ideas_frequency
      WHERE title_normalized IS NULL
      ORDER BY title, year
      LIMIT $1
    `, [BATCH_SIZE]);

    if (rows.rows.length === 0) break;

    // Normalize and batch-update.
    // Using a single UPDATE with VALUES is far faster than N individual UPDATEs.
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of rows.rows) {
      try {
        const normalized = normalizeTitle(row.title);
        values.push(row.title, row.year, normalized);
        placeholders.push(`($${idx}, $${idx + 1}::integer, $${idx + 2})`);
        idx += 3;
      } catch (err) {
        errors++;
        warn(`batch ${batch + 1} row title='${row.title}' year=${row.year}: ${err.message}`);
      }
    }

    if (placeholders.length > 0) {
      await client.query(`
        UPDATE more_ideas_frequency mif
        SET title_normalized = v.normalized
        FROM (VALUES ${placeholders.join(', ')}) AS v(title, year, normalized)
        WHERE mif.title = v.title
          AND (mif.year = v.year OR (mif.year IS NULL AND v.year IS NULL))
      `, values);
    }

    processed += rows.rows.length;
    const durationMs = Date.now() - batchStart;
    eta.recordBatch(durationMs);

    const pct = ((processed / total) * 100).toFixed(1);
    const sec = (durationMs / 1000).toFixed(1);
    log(`Batch ${batch + 1}/${totalBatches} complete — ${processed}/${total} (${pct}%) — ${sec}s — ETA ${eta.etaString(batch + 1)}`);

    await writeCheckpoint(batch + 1, {
      batch: batch + 1,
      processed,
      errors,
      ts: new Date().toISOString(),
    });

    if (errors / processed > ERROR_RATE_ABORT_THRESHOLD) {
      throw new Error(`Error rate ${(errors / processed * 100).toFixed(2)}% exceeds threshold — aborting`);
    }
  }

  log(`Normalization complete — ${processed} rows, ${errors} errors`);

  await writeStepCheckpoint('backfill_normalized');
}

// ---------- Step 3: classify catalog status ----------
async function classifyCatalogStatus(client) {
  log('=== Step 3: Classify catalog status ===');

  await queryWithHeartbeat(client, `
    UPDATE more_ideas_frequency mif
    SET catalog_status = CASE
      WHEN EXISTS (
        SELECT 1 FROM movies m
        WHERE LOWER(m.title) = LOWER(mif.title) AND m.year = mif.year
      ) THEN 'exact_match'
      WHEN EXISTS (
        SELECT 1 FROM movies m
        WHERE m.title_normalized = mif.title_normalized AND m.year = mif.year
      ) THEN 'normalized_match'
      WHEN EXISTS (
        SELECT 1 FROM movies m
        WHERE m.title_normalized = mif.title_normalized
          AND m.year BETWEEN mif.year - 1 AND mif.year + 1
          AND m.year != mif.year
      ) THEN 'fuzzy_year_match'
      ELSE 'missing'
    END
    WHERE catalog_status IS NULL
  `, [], 'classification UPDATE', 30);

  const breakdown = await client.query(`
    SELECT catalog_status, COUNT(*) AS n
    FROM more_ideas_frequency
    GROUP BY catalog_status
    ORDER BY n DESC
  `);
  log('Catalog status breakdown:');
  for (const row of breakdown.rows) {
    log(`  ${row.catalog_status}: ${row.n}`);
  }

  await writeStepCheckpoint('classify_catalog_status');
}

// ---------- Step 4: histogram report ----------
async function histogramReport(client) {
  log('=== Step 4: Histogram report ===');

  const result = await client.query(`
    SELECT
      catalog_status,
      CASE
        WHEN recommendation_count = 1 THEN '1'
        WHEN recommendation_count BETWEEN 2 AND 5 THEN '2-5'
        WHEN recommendation_count BETWEEN 6 AND 20 THEN '6-20'
        WHEN recommendation_count BETWEEN 21 AND 50 THEN '21-50'
        WHEN recommendation_count BETWEEN 51 AND 100 THEN '51-100'
        ELSE '100+'
      END AS frequency_bucket,
      COUNT(*) AS film_count
    FROM more_ideas_frequency
    GROUP BY catalog_status, frequency_bucket
    ORDER BY catalog_status, MIN(recommendation_count)
  `);

  log('Frequency distribution:');
  for (const row of result.rows) {
    log(`  ${row.catalog_status.padEnd(20)} ${row.frequency_bucket.padEnd(10)} ${row.film_count}`);
  }

  await writeStepCheckpoint('histogram_report');
}

// ---------- Step 5: export CSVs ----------
async function exportCsv(client, filename, sql, params) {
  const result = await client.query(sql, params);
  const rows = result.rows;
  if (rows.length === 0) {
    log(`${filename}: 0 rows — skipping`);
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(','));
  }
  const filepath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filepath, lines.join('\n'));
  log(`${filename}: ${rows.length} rows written`);
}

async function exportPriorityLists(client) {
  log('=== Step 5: Export priority CSVs ===');
  await ensureDir(OUTPUT_DIR);

  await exportCsv(client, 'missing_high_frequency.csv', `
    SELECT title, year, recommendation_count, distinct_source_count
    FROM more_ideas_frequency
    WHERE catalog_status = 'missing' AND recommendation_count >= 10
    ORDER BY recommendation_count DESC
  `);

  await exportCsv(client, 'fuzzy_match_review.csv', `
    SELECT
      mif.title AS rec_title,
      mif.year AS rec_year,
      mif.recommendation_count,
      m.title AS matched_title,
      m.year AS matched_year
    FROM more_ideas_frequency mif
    JOIN movies m
      ON m.title_normalized = mif.title_normalized
      AND m.year BETWEEN mif.year - 1 AND mif.year + 1
      AND m.year != mif.year
    WHERE mif.catalog_status = 'fuzzy_year_match'
      AND mif.recommendation_count >= 5
    ORDER BY mif.recommendation_count DESC
  `);

  await exportCsv(client, 'missing_long_tail.csv', `
    SELECT title, year, recommendation_count, distinct_source_count
    FROM more_ideas_frequency
    WHERE catalog_status = 'missing' AND recommendation_count < 10
    ORDER BY recommendation_count DESC
  `);

  await writeStepCheckpoint('export_priority_lists');
}

// ---------- Main ----------
async function main() {
  const start = Date.now();
  log('Starting recommendation frequency analysis');
  log(`Source: more_ideas table${CUTOFF_DATE ? `, created_at < '${CUTOFF_DATE}'` : ' (all records)'}`);
  log(`Batch size: ${BATCH_SIZE}`);
  log(`Resume mode: ${resume}`);

  await ensureDir(CHECKPOINT_DIR);

  const checkpoint = await loadStepCheckpoint();
  if (checkpoint.completedSteps.length > 0) {
    log(`Previous progress detected:`);
    log(`  Completed steps: ${checkpoint.completedSteps.join(', ')}`);
    if (checkpoint.lastUpdate) {
      log(`  Last update: ${checkpoint.lastUpdate}`);
    }
  }

  const client = await pool.connect();
  try {
    if (!checkpoint.completedSteps.includes('build_frequency_table')) {
      await buildFrequencyTable(client);
    } else {
      log('Step 1 (build_frequency_table) already complete — skipping');
    }

    if (!checkpoint.completedSteps.includes('backfill_normalized')) {
      await backfillNormalized(client);
    } else {
      log('Step 2 (backfill_normalized) already complete — skipping');
    }

    if (!checkpoint.completedSteps.includes('classify_catalog_status')) {
      await classifyCatalogStatus(client);
    } else {
      log('Step 3 (classify_catalog_status) already complete — skipping');
    }

    if (!checkpoint.completedSteps.includes('histogram_report')) {
      await histogramReport(client);
    } else {
      log('Step 4 (histogram_report) already complete — skipping');
    }

    if (!checkpoint.completedSteps.includes('export_priority_lists')) {
      await exportPriorityLists(client);
    } else {
      log('Step 5 (export_priority_lists) already complete — skipping');
    }
  } finally {
    client.release();
  }

  const totalSec = ((Date.now() - start) / 1000).toFixed(1);
  log('=== Complete ===');
  log(`Total time: ${totalSec}s`);
  await pool.end();
}

main().catch(err => {
  console.error(`[${ts()}] FATAL`, err);
  pool.end();
  process.exit(1);
});
