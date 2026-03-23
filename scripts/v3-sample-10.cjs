#!/usr/bin/env node

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MODEL = 'claude-sonnet-4-6';

const FRIEND_PROMPT = `Would you recommend {TITLE} ({YEAR}) to a friend who loves movies? Judge it honestly against others in its genre or series. Say NO if it's forgettable, wastes the viewer's time, or a serious movie lover would regret watching it. Give 2-3 reasons (5-8 words each) — be specific about dialogue, performances, or genre standing; tell the reader an important fact. In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

async function run(movie) {
  try {
    const text = FRIEND_PROMPT.replace('{TITLE}', movie.title).replace('{YEAR}', movie.year);
    const msg = await anthropic.messages.create({
      model: MODEL, max_tokens: 300,
      messages: [{ role: 'user', content: text }]
    });
    let raw = msg.content[0].text;
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(raw);
  } catch(e) {
    return null;
  }
}

async function main() {
  const client = await pool.connect();
  const { rows: movies } = await client.query(`
    SELECT tmdb_id, title, year FROM movies
    WHERE tmdb_id IS NOT NULL AND title IS NOT NULL AND year IS NOT NULL
    ORDER BY RANDOM() LIMIT 10
  `);
  client.release();
  await pool.end();

  const results = await Promise.all(movies.map(m => run(m)));

  results.forEach((r, i) => {
    if (!r) return;
    const m = movies[i];
    console.log(`\n[${r.recommendation}] ${m.title} (${m.year})`);
    r.reasons.forEach(reason => console.log(`  • ${reason}`));
    console.log(`  Context: ${r.context}`);
  });
}

main().catch(e => { console.error(e.message); process.exit(1); });
