const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

// Smart Prompt V1 - Testing Version
const SMART_PROMPT = `You are writing a concise, insightful movie analysis for curious film enthusiasts.

TARGET AUDIENCE: Ages 25-45, curious explorers who want to understand what makes a film interesting, not film critics.

CRITICAL FORMATTING RULES:
1. Output ONLY valid JSON (no markdown, no extra text)
2. Reference 2-4 related films using EXACTLY this format: **Movie Title (Year)**
   - Example: "This recalls **The Green Mile (1999)** in its patient storytelling."
   - Always include the year in parentheses
   - Never reference the current movie being analyzed
3. Keep analysis to 200-250 words (strict limit)

TONE REQUIREMENTS - AVOID:
❌ Flowery language: "haunting", "remarkable", "extraordinary", "nuanced", "mesmerizing", "brilliant", "profound"
❌ Film critic clichés: "transcends genre boundaries", "layered narrative texture", "meditation on themes"
❌ Vague statements: "delivers a nuanced performance", "explores complex themes"
❌ Hedging: "occasionally struggles", "sometimes feels", "potentially alienating"
❌ Passive voice: "The film delves into", "The narrative reveals"

TONE REQUIREMENTS - USE:
✅ Direct, active language: "We see", "[Character] does", "The film shows"
✅ Specific scenes and moments from the film
✅ Concrete visual details viewers would recognize
✅ Character actions/decisions in key moments
✅ Technical details WITH their effect (not just "great cinematography")

STRUCTURE (3 short paragraphs, ~70-80 words each):

Paragraph 1 - STORY HOOK:
- Lead with concrete story/character details, NOT abstract themes
- Include 1-2 specific scenes or moments
- What actually happens that makes this interesting?

Paragraph 2 - KEY ELEMENTS:
- Performance: HOW do actors convey emotion? Which scenes?
- Direction/Visual: WHAT specific techniques? What effect?
- Include 2-3 inline **Movie (Year)** references with brief context
- Focus on what viewers SEE and HEAR

Paragraph 3 - CONTEXT & SIGNIFICANCE:
- Why this matters or what makes it interesting
- Historical/cultural context if relevant
- 1-2 more **Movie (Year)** references
- What viewers learn or experience

FEATURED FILMS (2-4 films):
- Title and year MUST be exact
- Connection: 1 sentence explaining WHY it relates
- Variety: Mix of similar films and contrasts

MOOD TAGS (3-5 tags):
- Specific, evocative, non-generic
- Examples: "slow-burn-tension", "neo-noir-atmosphere", "quirky-ensemble"
- NOT: "drama", "good", "classic"

GENRE:
- Primary genre(s) from standard list
- Be specific: "psychological-thriller" not just "thriller"

OUTPUT FORMAT (strict JSON):
{
  "analysis": "3 paragraphs with inline **Movie (Year)** references. 200-250 words total.",
  "featuredFilms": [
    {
      "title": "Exact Movie Title",
      "year": 1999,
      "connection": "One sentence why it relates"
    }
  ],
  "mood": ["tag1", "tag2", "tag3"],
  "genre": "primary-genre, secondary-genre",
  "whyWatch": "YES or NO - would you recommend this to curious film fans?"
}

MOVIE TO ANALYZE:
Title: {MOVIE_TITLE}
Year: {MOVIE_YEAR}
Plot Summary: {TMDB_OVERVIEW}

OUTPUT (JSON only, no other text):`;

// Test movies covering different genres/styles
const TEST_MOVIES = [
  { title: 'The Shawshank Redemption', year: 1994, reason: 'Classic drama' },
  { title: 'Mad Max: Fury Road', year: 2015, reason: 'Action spectacle' },
  { title: 'Moonlight', year: 2016, reason: 'Art house' },
  { title: 'Toy Story', year: 1995, reason: 'Animation' },
  { title: 'Parasite', year: 2019, reason: 'Foreign language' },
  { title: 'The Thing', year: 1982, reason: 'Horror' },
  { title: 'Before Sunrise', year: 1995, reason: 'Dialogue-heavy' },
  { title: '2001: A Space Odyssey', year: 1968, reason: 'Experimental' },
  { title: 'Paddington 2', year: 2017, reason: 'Family film' },
  { title: 'Rashomon', year: 1950, reason: 'Old classic' }
];

// Validation functions
function validateAnalysis(output) {
  const checks = {
    isValidJSON: true, // If we got here, it parsed
    hasAllFields: ['analysis', 'featuredFilms', 'mood', 'genre', 'whyWatch'].every(k => k in output),
    analysisLength: output.analysis ? output.analysis.split(' ').length : 0,
    analysisInRange: false,
    hasMovieReferences: 0,
    movieRefsInRange: false,
    featuredFilmsCount: output.featuredFilms ? output.featuredFilms.length : 0,
    featuredFilmsInRange: false,
    featuredFilmsHaveYears: false,
    moodCount: output.mood ? output.mood.length : 0,
    moodInRange: false,
    whyWatchValid: ['YES', 'NO'].includes(output.whyWatch),
    noFloweryWords: true,
    floweryCount: 0,
    noClichés: true,
    clichéCount: 0
  };

  // Word count
  checks.analysisInRange = checks.analysisLength >= 180 && checks.analysisLength <= 280;

  // Movie references
  const movieRefs = (output.analysis || '').match(/\*\*[^*]+\*\*\s*\(\d{4}\)/g) || [];
  checks.hasMovieReferences = movieRefs.length;
  checks.movieRefsInRange = movieRefs.length >= 2 && movieRefs.length <= 6;

  // Featured films
  checks.featuredFilmsInRange = checks.featuredFilmsCount >= 2 && checks.featuredFilmsCount <= 4;
  checks.featuredFilmsHaveYears = output.featuredFilms ?
    output.featuredFilms.every(f => f.year && f.year > 1900 && f.year <= 2025) : false;

  // Mood tags
  checks.moodInRange = checks.moodCount >= 3 && checks.moodCount <= 5;

  // Flowery words
  const floweryPattern = /(haunting|remarkable|extraordinary|nuanced|mesmerizing|brilliant|profound)/gi;
  const floweryMatches = (output.analysis || '').match(floweryPattern) || [];
  checks.floweryCount = floweryMatches.length;
  checks.noFloweryWords = floweryMatches.length === 0;

  // Clichés
  const clichéPattern = /(transcends genre|layered narrative|meditation on|challenges conventional|fresh perspective)/gi;
  const clichéMatches = (output.analysis || '').match(clichéPattern) || [];
  checks.clichéCount = clichéMatches.length;
  checks.noClichés = clichéMatches.length === 0;

  return checks;
}

function scoreQuality(output, validation) {
  const scores = {
    formatCompliance: 0,
    toneQuality: 0,
    specificityScore: 0,
    overall: 0
  };

  // Format compliance (0-5)
  let formatPoints = 0;
  if (validation.hasAllFields) formatPoints++;
  if (validation.analysisInRange) formatPoints++;
  if (validation.movieRefsInRange) formatPoints++;
  if (validation.featuredFilmsInRange && validation.featuredFilmsHaveYears) formatPoints++;
  if (validation.moodInRange && validation.whyWatchValid) formatPoints++;
  scores.formatCompliance = formatPoints;

  // Tone quality (0-5)
  let tonePoints = 5;
  if (validation.floweryCount > 0) tonePoints -= Math.min(validation.floweryCount, 3);
  if (validation.clichéCount > 0) tonePoints -= Math.min(validation.clichéCount, 2);
  scores.toneQuality = Math.max(0, tonePoints);

  // Specificity (0-5) - check for concrete details
  const analysis = output.analysis || '';
  let specificityPoints = 0;

  // Check for character names (proper nouns in action)
  if (/[A-Z][a-z]+ (does|says|goes|finds|discovers|learns)/i.test(analysis)) specificityPoints++;

  // Check for "We see" or similar direct observations
  if (/(We see|The film shows|opens with|The scene)/i.test(analysis)) specificityPoints++;

  // Check for specific technical terms
  if (/(shot|camera|edit|cut|frame|lighting|score|sound)/i.test(analysis)) specificityPoints++;

  // Check for avoiding passive "delves/explores"
  if (!/(delves into|explores themes|reveals)/i.test(analysis)) specificityPoints++;

  // Check for movie references with context (not just dropped in)
  const movieRefsWithContext = (analysis.match(/like \*\*[^*]+\*\*|recalls \*\*[^*]+\*\*|mirrors \*\*[^*]+\*\*/gi) || []).length;
  if (movieRefsWithContext >= 1) specificityPoints++;

  scores.specificityScore = specificityPoints;

  // Overall score
  scores.overall = ((scores.formatCompliance + scores.toneQuality + scores.specificityScore) / 15 * 100).toFixed(1);

  return scores;
}

async function testSmartPrompt() {
  console.log('🧪 Testing Smart Prompt V1 on 10 diverse movies\n');
  console.log('=' .repeat(80));

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const results = [];
  let totalCost = 0;

  for (const testMovie of TEST_MOVIES) {
    console.log(`\n📽️  ${testMovie.title} (${testMovie.year}) - ${testMovie.reason}`);
    console.log('-'.repeat(80));

    try {
      // Get movie data from database (with analysis for plot overview)
      const movieResult = await pool.query(`
        SELECT m.id, m.title, m.year, ma.tmdb_overview
        FROM movies m
        LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE m.title ILIKE $1
        AND m.year = $2
        LIMIT 1
      `, [testMovie.title, testMovie.year]);

      if (movieResult.rows.length === 0) {
        console.log(`⚠️  Movie not found in database, skipping...`);
        continue;
      }

      const movie = movieResult.rows[0];
      const overview = movie.tmdb_overview || 'No plot summary available.';

      // Build prompt
      const prompt = SMART_PROMPT
        .replace('{MOVIE_TITLE}', movie.title)
        .replace('{MOVIE_YEAR}', movie.year)
        .replace('{TMDB_OVERVIEW}', overview);

      // Call Claude
      const startTime = Date.now();
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const elapsed = Date.now() - startTime;
      const response = message.content[0].text;

      // Estimate cost
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const cost = (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15);
      totalCost += cost;

      console.log(`⏱️  Generated in ${elapsed}ms`);
      console.log(`💰 Cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);

      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(response);
        console.log(`✅ Valid JSON`);
      } catch (e) {
        console.log(`❌ JSON Parse Error: ${e.message}`);
        results.push({
          movie: testMovie,
          error: 'Invalid JSON',
          response: response.substring(0, 200)
        });
        continue;
      }

      // Validate
      const validation = validateAnalysis(parsed);
      const quality = scoreQuality(parsed, validation);

      console.log(`\n📊 Validation Results:`);
      console.log(`   Word Count: ${validation.analysisLength} ${validation.analysisInRange ? '✅' : '❌'} (target: 180-280)`);
      console.log(`   Movie References: ${validation.hasMovieReferences} ${validation.movieRefsInRange ? '✅' : '❌'} (target: 2-6)`);
      console.log(`   Featured Films: ${validation.featuredFilmsCount} ${validation.featuredFilmsInRange ? '✅' : '❌'} (target: 2-4)`);
      console.log(`   Mood Tags: ${validation.moodCount} ${validation.moodInRange ? '✅' : '❌'} (target: 3-5)`);
      console.log(`   Flowery Words: ${validation.floweryCount} ${validation.noFloweryWords ? '✅' : '❌'} (target: 0)`);
      console.log(`   Clichés: ${validation.clichéCount} ${validation.noClichés ? '✅' : '❌'} (target: 0)`);

      console.log(`\n🎯 Quality Scores:`);
      console.log(`   Format Compliance: ${quality.formatCompliance}/5`);
      console.log(`   Tone Quality: ${quality.toneQuality}/5`);
      console.log(`   Specificity: ${quality.specificityScore}/5`);
      console.log(`   Overall: ${quality.overall}%`);

      // Save result
      results.push({
        movie: testMovie,
        validation,
        quality,
        cost,
        output: parsed,
        elapsed
      });

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        movie: testMovie,
        error: error.message
      });
    }
  }

  await pool.end();

  // Summary report
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📈 SUMMARY REPORT');
  console.log('='.repeat(80));

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  console.log(`\n✅ Successful: ${successful.length}/${TEST_MOVIES.length}`);
  console.log(`❌ Failed: ${failed.length}/${TEST_MOVIES.length}`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);

  if (successful.length > 0) {
    // Aggregate statistics
    const avgWordCount = successful.reduce((sum, r) => sum + r.validation.analysisLength, 0) / successful.length;
    const avgMovieRefs = successful.reduce((sum, r) => sum + r.validation.hasMovieReferences, 0) / successful.length;
    const avgFeaturedFilms = successful.reduce((sum, r) => sum + r.validation.featuredFilmsCount, 0) / successful.length;
    const floweryWordRate = successful.filter(r => r.validation.noFloweryWords).length / successful.length * 100;
    const clichéFreeRate = successful.filter(r => r.validation.noClichés).length / successful.length * 100;
    const formatComplianceRate = successful.filter(r =>
      r.validation.analysisInRange &&
      r.validation.movieRefsInRange &&
      r.validation.featuredFilmsInRange
    ).length / successful.length * 100;

    const avgFormatScore = successful.reduce((sum, r) => sum + r.quality.formatCompliance, 0) / successful.length;
    const avgToneScore = successful.reduce((sum, r) => sum + r.quality.toneQuality, 0) / successful.length;
    const avgSpecificityScore = successful.reduce((sum, r) => sum + r.quality.specificityScore, 0) / successful.length;
    const avgOverallScore = successful.reduce((sum, r) => sum + parseFloat(r.quality.overall), 0) / successful.length;

    console.log(`\n📊 Aggregate Statistics:`);
    console.log(`   Average Word Count: ${avgWordCount.toFixed(1)}`);
    console.log(`   Average Movie References: ${avgMovieRefs.toFixed(1)}`);
    console.log(`   Average Featured Films: ${avgFeaturedFilms.toFixed(1)}`);
    console.log(`   Flowery-Word-Free Rate: ${floweryWordRate.toFixed(1)}%`);
    console.log(`   Cliché-Free Rate: ${clichéFreeRate.toFixed(1)}%`);
    console.log(`   Format Compliance Rate: ${formatComplianceRate.toFixed(1)}%`);

    console.log(`\n🎯 Average Quality Scores:`);
    console.log(`   Format Compliance: ${avgFormatScore.toFixed(1)}/5`);
    console.log(`   Tone Quality: ${avgToneScore.toFixed(1)}/5`);
    console.log(`   Specificity: ${avgSpecificityScore.toFixed(1)}/5`);
    console.log(`   Overall: ${avgOverallScore.toFixed(1)}%`);

    console.log(`\n✅ TARGET COMPLIANCE (>95% goal):`);
    console.log(`   Format: ${formatComplianceRate >= 95 ? '✅ PASS' : '❌ FAIL'} (${formatComplianceRate.toFixed(1)}%)`);
    console.log(`   Tone: ${floweryWordRate >= 95 && clichéFreeRate >= 95 ? '✅ PASS' : '❌ FAIL'} (flowery: ${floweryWordRate.toFixed(1)}%, cliché: ${clichéFreeRate.toFixed(1)}%)`);
  }

  // Sample output
  if (successful.length > 0) {
    const sample = successful[0];
    console.log(`\n\n📝 SAMPLE OUTPUT (${sample.movie.title}):`);
    console.log('='.repeat(80));
    console.log(JSON.stringify(sample.output, null, 2));
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('✅ Test complete! Review results above.');
  console.log('='.repeat(80));
}

// Run test
testSmartPrompt().catch(console.error);
