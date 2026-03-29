const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TEST_MOVIES = [
  { title: "The Devil's Nightmare", year: 1971 },
  { title: "The Life and Times of Hank Greenberg", year: 1998 },
  { title: "The Santa Clause", year: 1994 },
  { title: "Dersu Uzala", year: 1975 },
  { title: "Yuva", year: 2004 },
  { title: "30 Rock: A One-Time Special", year: 2020 },
  { title: "The Burning Plain", year: 2008 },
  { title: "Stars Over Broadway", year: 1935 },
  { title: "The Lodge", year: 2019 },
  { title: "All the Real Girls", year: 2003 }
];

const PROMPT_A_SYSTEM = `You are a film expert providing quick, punchy recommendations for movies. For each film, respond with EXACTLY this JSON format:

{
  "recommendation": "YES" or "NO",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}

Each reason should be:
- 3-8 words maximum
- Vivid and specific
- Cover different aspects (performance, technique, cultural impact)
- Use active, engaging language

Examples:
YES: ["DiCaprio's career-defining raw performance", "Inarritu's bold experimental cinematography", "Gritty survival story resonates today"]
NO: ["Wooden acting kills momentum", "Overwrought melodramatic tone", "Wastes interesting premise completely"]`;

async function testPromptA(movie) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    temperature: 0.7,
    system: PROMPT_A_SYSTEM,
    messages: [{
      role: 'user',
      content: `Movie: ${movie.title} (${movie.year})\n\nProvide recommendation in the exact JSON format specified.`
    }]
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

async function testPromptB(movie) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    temperature: 0.7,
    messages: [{
      role: 'user',
      content: `Is ${movie.title} (${movie.year}) worth watching and why in three reasons (3-8 words max)`
    }]
  });

  return message.content[0].text.trim();
}

async function main() {
  console.log('='.repeat(80));
  console.log('WHYWATCH PROMPT COMPARISON TEST');
  console.log('Model: claude-sonnet-4-20250514 (Sonnet 4.6)');
  console.log('Testing 10 movies with 2 different prompts');
  console.log('='.repeat(80));
  console.log();

  const results = [];

  for (const movie of TEST_MOVIES) {
    console.log(`Testing: ${movie.title} (${movie.year})`);

    try {
      // Test Prompt A (current)
      const resultA = await testPromptA(movie);
      console.log('  Prompt A (Current):');
      console.log(`    ${resultA.recommendation}`);
      resultA.reasons.forEach(r => console.log(`    - ${r}`));

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test Prompt B (simplified)
      const resultB = await testPromptB(movie);
      console.log('  Prompt B (Simplified):');
      console.log(`    ${resultB}`);

      results.push({
        movie: `${movie.title} (${movie.year})`,
        promptA: resultA,
        promptB: resultB
      });

      console.log();

      // Delay between movies
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`  Error: ${error.message}`);
      console.log();
    }
  }

  // Output full JSON
  console.log('\n' + '='.repeat(80));
  console.log('FULL RESULTS (JSON):');
  console.log('='.repeat(80));
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
