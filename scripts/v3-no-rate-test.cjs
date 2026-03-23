#!/usr/bin/env node

/**
 * Tests NO rate with "recommend to a friend" framing vs current prompt
 * on 50 random movies from the DB
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MODEL = 'claude-sonnet-4-6';

const CURRENT_PROMPT = `Is {TITLE} ({YEAR}) worth watching? Judge it against others in its genre or series. Say NO if it fails to do anything interesting or wastes the viewer's time. Give 2-3 reasons (5-8 words each) — be specific about dialogue, performances, or genre standing; tell the reader an important fact. In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

const FRIEND_PROMPT = `Would you recommend {TITLE} ({YEAR}) to a friend who loves movies? Judge it honestly against others in its genre or series. Say NO if it's forgettable, wastes the viewer's time, or a serious movie lover would regret watching it. Give 2-3 reasons (5-8 words each) — be specific about dialogue, performances, or genre standing; tell the reader an important fact. In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

async function run(prompt, movie) {
  try {
    const text = prompt.replace('{TITLE}', movie.title).replace('{YEAR}', movie.year);
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: text }]
    });
    let raw = msg.content[0].text;
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(raw);
  } catch (e) {
    return null; // skip unparseable / refused responses
  }
}

async function main() {
  const client = await pool.connect();

  const { rows: movies } = await client.query(`
    SELECT tmdb_id, title, year
    FROM movies
    WHERE tmdb_id IS NOT NULL AND title IS NOT NULL AND year IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 50
  `);

  client.release();
  await pool.end();

  console.log(`\nTesting NO rate on 50 random movies — current vs friend framing\n`);

  let currentNO = 0, friendNO = 0;
  const noMovies = [];

  for (let i = 0; i < movies.length; i += 5) {
    const chunk = movies.slice(i, i + 5);
    const results = await Promise.all(chunk.map(m => Promise.all([
      run(CURRENT_PROMPT, m),
      run(FRIEND_PROMPT, m)
    ])));

    results.forEach(([cur, fri], j) => {
      const movie = chunk[j];
      if (!cur || !fri) return; // skip failures
      if (cur.recommendation === 'NO') currentNO++;
      if (fri.recommendation === 'NO') friendNO++;
      if (cur.recommendation !== fri.recommendation) {
        noMovies.push({ movie, current: cur.recommendation, friend: fri.recommendation });
      }
    });

    process.stdout.write(`\r  Progress: ${Math.min(i + 5, 50)}/50`);
  }

  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`RESULTS`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Current prompt NO rate: ${currentNO}/50 = ${(currentNO/50*100).toFixed(0)}%`);
  console.log(`Friend  prompt NO rate: ${friendNO}/50 = ${(friendNO/50*100).toFixed(0)}%`);

  if (noMovies.length > 0) {
    console.log(`\nMovies where they disagree (${noMovies.length}):`);
    noMovies.forEach(({ movie, current, friend }) => {
      console.log(`  ${movie.title} (${movie.year}): current=${current} → friend=${friend}`);
    });
  } else {
    console.log(`\nNo disagreements between prompts.`);
  }

  console.log();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
