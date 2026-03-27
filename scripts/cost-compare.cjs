const { default: Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORE_VOICE = `You are a passionate film expert who gets straight to the point. Skip the fluff and dive into great movies.

DIRECT COMMUNICATION RULES:
- NO generic phrases like "cinema offers", "the genre explores", "film has always been", "this represents"
- NO academic preambles or explanatory setup
- Start with concrete films, directors, or movements immediately
- Be conversational and enthusiastic, like recommending to a friend
- Lead with specific examples, follow with brief context if needed
- Use active voice and definitive statements

BAD: "Science fiction cinema has long explored themes of technology and humanity."
GOOD: "Blade Runner nails cyberpunk neon-soaked paranoia."

IMPORTANT FILM FOCUS: You are exclusively a film expert.
- Math/Science -> A Beautiful Mind (2001), Hidden Figures (2016)
- Cooking -> Chef (2014), Julie & Julia (2009)
- History -> Dunkirk (2017), 1917 (2019)

Jump straight into film recommendations. Be direct, specific, and enthusiastic.`;

const WHY_WATCH_SUFFIX = `
You are generating focused "Why Watch" recommendations for a movie database.

Here is the film you need to analyze:

<film_title>
The Godfather (1972)
</film_title>

<movie_data>
{
  "director": "Francis Ford Coppola",
  "genre": "Crime Drama",
  "year": 1972
}
</movie_data>

CRITICAL: Your response must contain ONLY the JSON structure specified below.

Why Watch Recommendation Guidelines:

1. Binary Recommendation (balanced but fair):
- YES: Worth someone's time - essential viewing, great entertainment, historical significance, exceptional craft
- NO: Not worth the time investment. Provide 2 specific problems + 1 better alternative

IMPORTANT: Aim for roughly 70% YES recommendations.

2. Compelling Reasons (exactly 3):
- Keep each reason 3-6 words (short and punchy)
- CRITICAL: Use different reasoning categories for each reason.
- RANDOMIZE the order of categories
- Vary vocabulary extensively - avoid: "masterful," "portrayal," "explores," "journey," "stunning"

Your response must contain ONLY this JSON structure:

{
  "whyWatch": {
    "recommendation": "YES|NO",
    "reasons": [
      "Reason 1 (3-6 words)",
      "Reason 2 (3-6 words)",
      "Reason 3 (3-6 words)"
    ]
  },
  "metadata": {
    "title": "The Godfather (1972)",
    "generatedAt": "2025-03-23T00:00:00.000Z",
    "wordCounts": [0, 0, 0],
    "vocabularyScore": "fresh|mixed|cliched"
  }
}`;

const fullWhyWatchPrompt = CORE_VOICE + '\n\n' + WHY_WATCH_SUFFIX;

const SYSTEM_SONNET = `You are a film expert. When given a movie collection name, return a structured list of the most important and representative films for that collection.

Organize into 4-5 subcategories with 5-7 movies each.

Return as JSON only (no markdown, no explanation):
{
  "subcategories": [
    {
      "name": "subcategory name",
      "movies": [
        { "title": "...", "year": 1999 }
      ]
    }
  ]
}`;

async function measure() {
  console.log('Making 2 API calls to measure token counts...\n');

  // Note: original WhyWatch ran on claude-3-5-haiku-20241022 ($0.25/$1.25 per 1M)
  // Using claude-haiku-4-5 here ($0.80/$4.00 per 1M) to measure token counts
  // We'll apply original pricing to the measured token counts
  const wwResp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: fullWhyWatchPrompt }]
  });

  const editResp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_SONNET, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: 'Give me a complete list of movies you\'d call "Asian Hitman Thrillers".' }]
  });

  const ww = wwResp.usage;
  const ed = editResp.usage;

  // WhyWatch: Haiku 3.5 = $0.25/$1.25 per 1M in/out
  const wwCost = (ww.input_tokens * 0.25 / 1e6) + (ww.output_tokens * 1.25 / 1e6);

  // Editorial Pass 1 first call (cache WRITE)
  const edCostWrite =
    ((ed.cache_creation_input_tokens || 0) * 3.75 / 1e6) +
    ((ed.cache_read_input_tokens || 0) * 0.30 / 1e6) +
    (ed.input_tokens * 3.00 / 1e6) +
    (ed.output_tokens * 15.00 / 1e6);

  // Subsequent calls (cache READ): system cached at 10%, user msg at full price
  const systemToks = ed.cache_creation_input_tokens || 0;
  const userToks = ed.input_tokens;
  const edCostRead =
    (systemToks * 0.30 / 1e6) +
    (userToks * 3.00 / 1e6) +
    (ed.output_tokens * 15.00 / 1e6);

  console.log('=== WhyWatch (Haiku 3.5, per-movie) ===');
  console.log('  input_tokens:  ' + ww.input_tokens);
  console.log('  output_tokens: ' + ww.output_tokens);
  console.log('  cost per call: $' + wwCost.toFixed(5));
  console.log('  @ 30,000 movies: $' + (wwCost * 30000).toFixed(2));
  console.log('');

  console.log('=== Editorial Pass 1 only (Sonnet 4.6, per-collection) ===');
  console.log('  cache_creation_input_tokens (system): ' + (ed.cache_creation_input_tokens || 0));
  console.log('  input_tokens (user msg):               ' + ed.input_tokens);
  console.log('  output_tokens:                         ' + ed.output_tokens);
  console.log('  cost 1st call (cache write): $' + edCostWrite.toFixed(5));
  console.log('  cost 2nd+ call (cache read): $' + edCostRead.toFixed(5));
  console.log('');

  const totalEdit = edCostWrite + (edCostRead * 9299);
  console.log('  @ 9,300 collections (1 write + 9,299 reads):');
  console.log('    Pass 1 total: $' + totalEdit.toFixed(2));
  console.log('');

  const moviesPerCollection = 25;
  const wwPerCollection = wwCost * moviesPerCollection;
  console.log('=== Apples-to-apples: same 25 movies ===');
  console.log('  WhyWatch x25:  $' + wwPerCollection.toFixed(5));
  console.log('  Editorial P1:  $' + edCostRead.toFixed(5));
  console.log('  Ratio: Editorial is ' + (edCostRead / wwPerCollection).toFixed(1) + 'x WhyWatch cost');
  console.log('');
  console.log('  WHY: Sonnet 4.6 output @ $15/M vs Haiku 3.5 @ $1.25/M = ' + (15/1.25).toFixed(0) + 'x output cost');
  console.log('  And editorial generates ~' + ed.output_tokens + ' tokens vs ~' + ww.output_tokens + ' tokens per WhyWatch');
}

measure().catch(console.error);
