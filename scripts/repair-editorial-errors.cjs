#!/usr/bin/env node
/**
 * repair-editorial-errors.cjs
 *
 * Post-processes files in logs/editorial-errors/:
 * 1. Tries to extract the last valid JSON block from the raw Claude output
 * 2. Validates the extracted JSON has the expected shape
 * 3. Writes it to browse_lists.editorial_data in the DB
 * 4. On success, deletes the error file
 *
 * Usage:
 *   node --env-file=.env.local scripts/repair-editorial-errors.cjs [--dry-run]
 */

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ERRORS_DIR = path.join(__dirname, '../logs/editorial-errors');
const DRY_RUN    = process.argv.includes('--dry-run');
const pool       = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Extract last valid JSON object from a string ──────────────────────────────

function extractLastJson(text) {
  const blocks = [];
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  // Try blocks in reverse — last is usually the restart/final version
  for (let i = blocks.length - 1; i >= 0; i--) {
    try { return JSON.parse(blocks[i]); } catch (_) {}
  }
  return null;
}

// ── Minimal validation ────────────────────────────────────────────────────────

function validate(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'not an object';
  if (typeof parsed.subtitle !== 'string') return 'missing subtitle';
  if (!Array.isArray(parsed.subcategories) || parsed.subcategories.length === 0)
    return 'missing subcategories';
  for (const sub of parsed.subcategories) {
    if (!sub.name || !Array.isArray(sub.movies) || sub.movies.length === 0)
      return `subcategory "${sub.name}" has no movies`;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(ERRORS_DIR).filter(f => f.endsWith('.json'));

  console.log(`\n🔧 repair-editorial-errors`);
  console.log(`   Mode:   ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Files:  ${files.length}\n`);

  if (files.length === 0) {
    console.log('   Nothing to repair.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  let repaired = 0, skipped = 0;

  for (const file of files) {
    const filePath = path.join(ERRORS_DIR, file);
    const record   = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { id, title, raw } = record;

    const parsed = extractLastJson(raw);
    if (!parsed) {
      console.log(`  SKIP (no valid JSON): ${title}`);
      skipped++;
      continue;
    }

    const err = validate(parsed);
    if (err) {
      console.log(`  SKIP (validation: ${err}): ${title}`);
      skipped++;
      continue;
    }

    console.log(`  ✅ Repaired: ${title} (${parsed.subcategories.length} subcategories)`);

    if (!DRY_RUN) {
      await client.query(
        `UPDATE browse_lists SET editorial_data = $1 WHERE id = $2`,
        [JSON.stringify(parsed), id]
      );
      fs.unlinkSync(filePath);
    }
    repaired++;
  }

  client.release();
  await pool.end();

  console.log(`\n✅ Done`);
  console.log(`   Repaired: ${repaired}`);
  console.log(`   Skipped:  ${skipped}\n`);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
