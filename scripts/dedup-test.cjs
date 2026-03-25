#!/usr/bin/env node
// dedup-test.cjs
// Test: send 200 Drama collection titles + subcategory names to Haiku
// Ask it to identify clusters of semantically similar/redundant collections
// Output: clusters with keep/suppress recommendations

'use strict';

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = new Anthropic();

async function main() {
  console.log('Fetching 200 Drama collections...');

  const result = await pool.query(`
    SELECT bl.id, COALESCE(bl.revised_title, bl.title) AS title,
           array_to_string(
             ARRAY(SELECT sub->>'name'
                   FROM jsonb_array_elements(bl.editorial_data->'subcategories') sub
                   LIMIT 4),
             ' | '
           ) AS subcats
    FROM browse_lists bl
    WHERE bl.status = 'active'
      AND bl.categories[1] = 'Drama'
      AND bl.editorial_data IS NOT NULL
    ORDER BY bl.id
    LIMIT 200
  `);

  const collections = result.rows;
  console.log(`Got ${collections.length} collections\n`);

  // Format the list for Haiku
  const listText = collections.map((c, i) =>
    `[${i + 1}] ${c.title}\n    Subcategories: ${c.subcats || '(none)'}`
  ).join('\n\n');

  const prompt = `You are reviewing a list of movie collection titles for a streaming discovery product. Each entry has a title and its subcategory names.

Your task: identify clusters of collections that are semantically redundant — meaning they cover essentially the same thematic territory and would contain largely the same movies.

For each cluster you find (2 or more redundant collections):
- List the collection numbers
- Name the theme they share
- Recommend which ONE to keep (the most specific/distinctive title)
- Mark the rest as SUPPRESS

Only flag genuine redundancy. Collections that are related but have meaningfully different scope (e.g. "Vietnam War Films" vs "Gulf War Films") should NOT be clustered.

Output format — one cluster per block:
CLUSTER: [theme]
KEEP: [number] [title]
SUPPRESS: [number] [title]
SUPPRESS: [number] [title]
...

If a collection has no redundant peer, skip it entirely.

Here are the ${collections.length} collections:

${listText}`;

  console.log(`Sending to Haiku (~${Math.round(prompt.length / 4)} tokens estimated)...\n`);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const output = response.content[0].text;

  // Count clusters and suppressions
  const clusterCount = (output.match(/^CLUSTER:/gm) || []).length;
  const suppressCount = (output.match(/^SUPPRESS:/gm) || []).length;
  const keepCount = (output.match(/^KEEP:/gm) || []).length;

  console.log('=== HAIKU OUTPUT ===\n');
  console.log(output);
  console.log('\n=== SUMMARY ===');
  console.log(`Clusters found: ${clusterCount}`);
  console.log(`Collections to keep: ${keepCount}`);
  console.log(`Collections to suppress: ${suppressCount}`);
  console.log(`Suppression rate: ${Math.round(suppressCount / collections.length * 100)}% of ${collections.length} sampled`);
  console.log(`\nInput tokens: ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  console.log(`Est. cost for full 3234 Drama: $${(response.usage.input_tokens * 3234 / 200 / 1000000 * 0.80 + response.usage.output_tokens * 3234 / 200 / 1000000 * 4.0).toFixed(3)}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
