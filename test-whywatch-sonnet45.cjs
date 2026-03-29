const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// EXACT prompt from batch-enhanced-why-watch.js
const RECOMMENDATIONS_PROMPT = `You are a film expert providing quick, punchy recommendations for movies. For each film, respond with EXACTLY this JSON format:

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

// The 10 test movies
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

async function generateRecommendationSonnet45(movie) {
  try {
    console.log(`\nGenerating for: ${movie.title} (${movie.year})`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Sonnet 4.5
      max_tokens: 200,
      temperature: 0.7,
      system: RECOMMENDATIONS_PROMPT,
      messages: [{
        role: 'user',
        content: `Movie: ${movie.title} (${movie.year})

Provide recommendation in the exact JSON format specified.`
      }]
    });

    const responseText = message.content[0].text.trim();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    // Validate format
    if (!recommendation.recommendation || !recommendation.reasons || !Array.isArray(recommendation.reasons) || recommendation.reasons.length !== 3) {
      throw new Error('Invalid recommendation format');
    }

    return {
      ...movie,
      recommendation: recommendation.recommendation,
      reasons: recommendation.reasons,
      model: 'claude-sonnet-4-20250514',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error for ${movie.title}:`, error.message);
    return {
      ...movie,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('WhyWatch Comparison: Sonnet 4.5 Test');
  console.log('='.repeat(70));
  console.log(`Testing ${TEST_MOVIES.length} movies with identical prompt`);
  console.log('Model: claude-sonnet-4-20250514 (Sonnet 4.5)');
  console.log('='.repeat(70));

  const results = [];

  for (const movie of TEST_MOVIES) {
    const result = await generateRecommendationSonnet45(movie);
    results.push(result);

    if (!result.error) {
      console.log(`✓ ${movie.title} (${movie.year})`);
      console.log(`  Recommendation: ${result.recommendation}`);
      console.log(`  Reasons:`);
      result.reasons.forEach(r => console.log(`    - ${r}`));
    } else {
      console.log(`✗ ${movie.title} (${movie.year}) - ${result.error}`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('Complete Results JSON:');
  console.log('='.repeat(70));
  console.log(JSON.stringify(results, null, 2));

  await pool.end();
}

main().catch(console.error);
