#!/usr/bin/env node

/**
 * Tests the new specificity-focused prompt on known movies
 * Compares old vs new prompt output side by side
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

const OLD_PROMPT = `Is {TITLE} ({YEAR}) worth watching? Judge it against others in its genre or series. Say NO if it fails to do anything interesting or wastes the viewer's time. Give 2-3 reasons (5-8 words each). In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

const NEW_PROMPT = `Is {TITLE} ({YEAR}) worth watching? Judge it against others in its genre or series. Say NO if it fails to do anything interesting or wastes the viewer's time. Give 2-3 reasons (5-8 words each) — be specific about dialogue, performances, or genre standing; tell the reader an important fact. In 30-50 words, say more without repeating the reasons or using vague praise. DO NOT USE: masterfully, iconic, breathtaking, groundbreaking, legendary, revolutionary, timeless, classic. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

const TEST_MOVIES = [
  { title: 'Star Trek II: The Wrath of Khan', year: 1982 },
  { title: 'The Godfather', year: 1972 },
  { title: 'Sideways', year: 2004 },
  { title: 'Batman & Robin', year: 1997 },  // known bad
  { title: 'Jurassic Park', year: 1993 },
];

async function run(prompt, movie) {
  const text = prompt.replace('{TITLE}', movie.title).replace('{YEAR}', movie.year);
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: 'user', content: text }]
  });
  let raw = msg.content[0].text;
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(raw);
}

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('SPECIFICITY PROMPT TEST — Old vs New');
  console.log(`${'='.repeat(70)}\n`);

  for (const movie of TEST_MOVIES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${movie.title} (${movie.year})`);
    console.log(`${'─'.repeat(60)}`);

    const [oldResult, newResult] = await Promise.all([
      run(OLD_PROMPT, movie),
      run(NEW_PROMPT, movie)
    ]);

    console.log(`\nOLD [${oldResult.recommendation}]`);
    oldResult.reasons.forEach(r => console.log(`  • ${r}`));
    console.log(`  Context: ${oldResult.context}`);

    console.log(`\nNEW [${newResult.recommendation}]`);
    newResult.reasons.forEach(r => console.log(`  • ${r}`));
    console.log(`  Context: ${newResult.context}`);
  }

  console.log(`\n${'='.repeat(70)}\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
