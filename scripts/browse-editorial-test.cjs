#!/usr/bin/env node

const { Anthropic } = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY = process.argv[2] || 'Teen Identity Thrillers';

const PROMPT = `Give me a complete list of movies you'd call "${CATEGORY}".

Organize into 4-5 subcategories with 5-7 movies each. Pick the most important/representative films.

Return as JSON only (no markdown, no explanation):
{
  "subtitle": "one sentence framing what defines this category",
  "subcategories": [
    {
      "name": "subcategory name",
      "description": "one sentence",
      "movies": [
        { "title": "...", "year": 1999, "note": "one specific sentence about why it fits", "tags": ["tag1", "tag2"] }
      ]
    }
  ]
}`;

async function main() {
  console.log(`\nCategory: "${CATEGORY}"\n`);
  console.log('Calling API...\n');

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: PROMPT }]
  });

  const raw = msg.content[0].text;

  // Try to parse
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    console.log('✅ Valid JSON\n');
    console.log(`Subtitle: ${parsed.subtitle}\n`);
    console.log(`Subcategories: ${parsed.subcategories.length}`);
    parsed.subcategories.forEach(sub => {
      console.log(`\n  [${sub.name}] — ${sub.movies.length} movies`);
      console.log(`  ${sub.description}`);
      sub.movies.slice(0, 2).forEach(m => {
        console.log(`    • ${m.title} (${m.year}) [${(m.tags||[]).join(', ')}]`);
        console.log(`      "${m.note}"`);
      });
      if (sub.movies.length > 2) console.log(`    ...and ${sub.movies.length - 2} more`);
    });
    const totalMovies = parsed.subcategories.reduce((n, s) => n + s.movies.length, 0);
    console.log(`\nTotal movies: ${totalMovies}`);
    console.log(`Tokens used: ${msg.usage.input_tokens} in / ${msg.usage.output_tokens} out`);
  } catch (e) {
    console.log('❌ JSON parse failed\n');
    console.log('Raw output:\n');
    console.log(raw);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
