#!/usr/bin/env node

/**
 * Test script: send 30 real collection titles to Claude for curation review
 * Claude gets the purpose + titles + genre tags, uses its own judgment
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BATCH_SIZE = parseInt(process.argv[2]) || 30;

const PROMPT = (collections) => `You're helping curate a movie discovery platform — intelligent, meaningful, and appealing to people who take movies seriously.

Here are ${collections.length} collection names, each with their genre aisles. Collections span everything: Holocaust films, horror, romantic comedies, war, animation — all treated with equal seriousness.

Review them:
- Keep ones that already work well
- Improve ones that are vague, academic, or awkward
- Flag near-duplicates within this batch

For improvements: clear and specific, max 5 words. The reader should immediately know what's in the collection — like "Summer Camp Horror" or "Stalinist Purge Dramas". Don't add mood or personality; just say what it is.

Return JSON only (no markdown):
[
  {
    "id": "...",
    "original": "...",
    "revised": "...",
    "action": "keep" | "improve" | "duplicate",
    "duplicate_of": "original title if duplicate, else null",
    "note": "brief reason if improved or flagged"
  }
]

Collections:
${JSON.stringify(collections, null, 2)}`;

async function main() {
  const client = await pool.connect();

  const { rows } = await client.query(`
    SELECT id, title, categories
    FROM browse_lists
    WHERE array_length(categories, 1) > 0
    ORDER BY RANDOM()
    LIMIT $1
  `, [BATCH_SIZE]);

  client.release();
  await pool.end();

  const collections = rows.map(r => ({
    id: r.id,
    title: r.title,
    genres: r.categories
  }));

  console.log(`\nSending ${collections.length} collections to Claude...\n`);

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: PROMPT(collections) }]
  });

  const raw = msg.content[0].text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let results;
  try {
    results = JSON.parse(raw);
  } catch (e) {
    console.log('❌ JSON parse failed\n');
    console.log(raw);
    return;
  }

  const byId     = Object.fromEntries(rows.map(r => [r.id, r]));
  const kept     = results.filter(r => r.action === 'keep');
  const improved = results.filter(r => r.action === 'improve');
  const dupes    = results.filter(r => r.action === 'duplicate');

  const label = (r) => (byId[r.id]?.categories || []).join(', ') || '?';

  console.log(`✅ ${results.length} reviewed | ${kept.length} kept | ${improved.length} improved | ${dupes.length} duplicates\n`);

  if (improved.length) {
    console.log('=== IMPROVED ===');
    improved.forEach(r => {
      console.log(`  ${label(r)}: "${r.original}"`);
      console.log(`  → "${r.revised}"`);
      if (r.note) console.log(`     (${r.note})`);
      console.log();
    });
  }

  if (dupes.length) {
    console.log('=== DUPLICATES ===');
    dupes.forEach(r => {
      console.log(`  ${label(r)}: "${r.original}" → same as "${r.duplicate_of}"`);
    });
    console.log();
  }

  console.log('=== KEPT ===');
  kept.forEach(r => console.log(`  ${label(r)}: "${r.original}"`));

  console.log(`Tokens: ${msg.usage.input_tokens} in / ${msg.usage.output_tokens} out`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
