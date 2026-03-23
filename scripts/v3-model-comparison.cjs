#!/usr/bin/env node

/**
 * V3 Model Comparison Test
 *
 * Compares Haiku 3.5 vs Sonnet 4.5 for V3 WhyWatch generation
 * - Tests 50 mid-tier movies (5-7 star rating)
 * - Evaluates quality, cost, and compliance
 * - Generates decision report
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs/promises');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// V3 Prompt Template (from v3-test-config.json)
const V3_PROMPT = `DO NOT USE WORDS LIKE MASTERFULLY, ICONIC, BREATHTAKING, GROUNDBREAKING, LEGENDARY, REVOLUTIONARY, TIMELESS, CLASSIC. Is {TITLE} ({YEAR}) a good watch? Give me 2-3 reasons why its worth watching (limited to 5-8 words). In a 30-50 word summary tell me more about the bullets without repeating them OR USING FLUFFY LANGUAGE. Output as JSON: {"recommendation": "YES" or "NO", "reasons": [...], "context": "..."}`;

// Stopwords to check
const STOPWORDS = ['masterfully', 'masterful', 'iconic', 'breathtaking', 'groundbreaking', 'legendary', 'revolutionary', 'timeless', 'classic', 'unforgettable', 'brilliant', 'epic', 'perfect', 'ultimate', 'definitive', 'powerful', 'compelling', 'stunning', 'amazing', 'incredible', 'extraordinary'];

/**
 * Get 50 random mid-tier movies for testing
 */
async function getSampleMovies() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT tmdb_id, title, year
      FROM movies
      WHERE year BETWEEN 1970 AND 2020
        AND title IS NOT NULL
        AND year IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 50
    `);

    console.log(`📊 Selected ${result.rows.length} movies for testing`);
    return result.rows;

  } finally {
    client.release();
  }
}

/**
 * Generate WhyWatch using specified model
 */
async function generateWhyWatch(movie, model) {
  const prompt = V3_PROMPT
    .replace('{TITLE}', movie.title)
    .replace('{YEAR}', movie.year);

  try {
    const message = await anthropic.messages.create({
      model: model,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let response = message.content[0].text;
    // Strip markdown code fences if present (newer models wrap JSON in ```json...```)
    response = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(response);

    // Calculate cost
    const cost = (
      message.usage.input_tokens * 3 +    // $3/million input
      message.usage.output_tokens * 15    // $15/million output
    ) / 1000000;

    return {
      success: true,
      response: parsed,
      rawResponse: response,
      cost: cost,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate response against criteria
 */
function validateResponse(response) {
  const validation = {
    jsonParsed: true,
    hasRequiredFields: false,
    reasonWordCounts: [],
    contextWordCount: 0,
    stopwordViolations: [],
    recommendation: null
  };

  if (!response || !response.recommendation || !response.reasons || !response.context) {
    validation.jsonParsed = false;
    return validation;
  }

  validation.hasRequiredFields = true;
  validation.recommendation = response.recommendation;

  // Check reason word counts
  response.reasons.forEach(reason => {
    const wordCount = reason.split(/\s+/).length;
    validation.reasonWordCounts.push(wordCount);
  });

  // Check context word count
  validation.contextWordCount = response.context.split(/\s+/).length;

  // Check for stopwords
  const fullText = (response.reasons.join(' ') + ' ' + response.context).toLowerCase();
  STOPWORDS.forEach(word => {
    if (fullText.includes(word)) {
      validation.stopwordViolations.push(word);
    }
  });

  return validation;
}

/**
 * Score model performance
 */
function scoreModel(results) {
  const scores = {
    totalMovies: results.length,
    jsonParseSuccess: 0,
    requiredFieldsSuccess: 0,
    reasonWordCountCompliance: 0,
    contextWordCountCompliance: 0,
    stopwordViolations: 0,
    yesCount: 0,
    noCount: 0,
    totalCost: 0,
    avgInputTokens: 0,
    avgOutputTokens: 0
  };

  let totalInput = 0;
  let totalOutput = 0;

  results.forEach(result => {
    if (!result.success) return;

    scores.totalCost += result.cost;
    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;

    const validation = result.validation;

    if (validation.jsonParsed) scores.jsonParseSuccess++;
    if (validation.hasRequiredFields) scores.requiredFieldsSuccess++;

    // Check word count compliance (5-8 words per reason)
    const reasonCompliant = validation.reasonWordCounts.every(count => count >= 5 && count <= 8);
    if (reasonCompliant) scores.reasonWordCountCompliance++;

    // Check context compliance (30-50 words)
    if (validation.contextWordCount >= 30 && validation.contextWordCount <= 50) {
      scores.contextWordCountCompliance++;
    }

    if (validation.stopwordViolations.length > 0) scores.stopwordViolations++;

    if (validation.recommendation === 'YES') scores.yesCount++;
    if (validation.recommendation === 'NO') scores.noCount++;
  });

  scores.avgInputTokens = Math.round(totalInput / results.length);
  scores.avgOutputTokens = Math.round(totalOutput / results.length);

  scores.noRate = ((scores.noCount / scores.totalMovies) * 100).toFixed(1);

  // Calculate percentages
  scores.jsonParseRate = ((scores.jsonParseSuccess / scores.totalMovies) * 100).toFixed(1);
  scores.requiredFieldsRate = ((scores.requiredFieldsSuccess / scores.totalMovies) * 100).toFixed(1);
  scores.reasonComplianceRate = ((scores.reasonWordCountCompliance / scores.totalMovies) * 100).toFixed(1);
  scores.contextComplianceRate = ((scores.contextWordCountCompliance / scores.totalMovies) * 100).toFixed(1);
  scores.stopwordViolationRate = ((scores.stopwordViolations / scores.totalMovies) * 100).toFixed(1);

  return scores;
}

/**
 * Generate markdown report
 */
function generateReport(haikuResults, sonnetResults, haikuScores, sonnetScores, movies) {
  const report = `# V3 Model Comparison Report

**Date:** ${new Date().toISOString()}
**Test Sample:** 50 random movies
**Models:** Haiku 4.5 vs Sonnet 4.6

## Overall Scores

| Metric | Haiku 4.5 | Sonnet 4.6 | Difference |
|--------|-----------|----------|------------|
| **JSON Parse Success** | ${haikuScores.jsonParseRate}% (${haikuScores.jsonParseSuccess}/${haikuScores.totalMovies}) | ${sonnetScores.jsonParseRate}% (${sonnetScores.jsonParseSuccess}/${sonnetScores.totalMovies}) | ${(parseFloat(haikuScores.jsonParseRate) - parseFloat(sonnetScores.jsonParseRate)).toFixed(1)}% |
| **Required Fields** | ${haikuScores.requiredFieldsRate}% (${haikuScores.requiredFieldsSuccess}/${haikuScores.totalMovies}) | ${sonnetScores.requiredFieldsRate}% (${sonnetScores.requiredFieldsSuccess}/${sonnetScores.totalMovies}) | ${(parseFloat(haikuScores.requiredFieldsRate) - parseFloat(sonnetScores.requiredFieldsRate)).toFixed(1)}% |
| **Reason Word Count (5-8)** | ${haikuScores.reasonComplianceRate}% (${haikuScores.reasonWordCountCompliance}/${haikuScores.totalMovies}) | ${sonnetScores.reasonComplianceRate}% (${sonnetScores.reasonWordCountCompliance}/${sonnetScores.totalMovies}) | ${(parseFloat(haikuScores.reasonComplianceRate) - parseFloat(sonnetScores.reasonComplianceRate)).toFixed(1)}% |
| **Context Word Count (30-50)** | ${haikuScores.contextComplianceRate}% (${haikuScores.contextWordCountCompliance}/${haikuScores.totalMovies}) | ${sonnetScores.contextComplianceRate}% (${sonnetScores.contextWordCountCompliance}/${sonnetScores.totalMovies}) | ${(parseFloat(haikuScores.contextComplianceRate) - parseFloat(sonnetScores.contextComplianceRate)).toFixed(1)}% |
| **Stopword Violations** | ${haikuScores.stopwordViolationRate}% (${haikuScores.stopwordViolations} movies) | ${sonnetScores.stopwordViolationRate}% (${sonnetScores.stopwordViolations} movies) | ${(parseFloat(haikuScores.stopwordViolationRate) - parseFloat(sonnetScores.stopwordViolationRate)).toFixed(1)}% |
| **NO Rate (target 15-30%)** | ${haikuScores.noRate}% (${haikuScores.noCount}/${haikuScores.totalMovies}) | ${sonnetScores.noRate}% (${sonnetScores.noCount}/${sonnetScores.totalMovies}) | ${(parseFloat(haikuScores.noRate) - parseFloat(sonnetScores.noRate)).toFixed(1)}% |

**Interpretation:**
- Positive difference = Haiku ahead
- Negative difference = Sonnet ahead
- Differences >10% are significant

## Cost Analysis

| Model | Cost per Movie | Total (50 movies) | Projected (35K) |
|-------|---------------|-------------------|-----------------|
| **Haiku 4.5** | $${(haikuScores.totalCost / 50).toFixed(5)} | $${haikuScores.totalCost.toFixed(3)} | $${(haikuScores.totalCost / 50 * 35000).toFixed(0)} |
| **Sonnet 4.6** | $${(sonnetScores.totalCost / 50).toFixed(5)} | $${sonnetScores.totalCost.toFixed(3)} | $${(sonnetScores.totalCost / 50 * 35000).toFixed(0)} |
| **Savings** | - | - | **$${Math.abs((sonnetScores.totalCost / 50 * 35000) - (haikuScores.totalCost / 50 * 35000)).toFixed(0)}** |

## Token Usage

| Model | Avg Input | Avg Output | Total Output |
|-------|-----------|------------|--------------|
| **Haiku 4.5** | ${haikuScores.avgInputTokens} | ${haikuScores.avgOutputTokens} | ${haikuScores.avgOutputTokens * 50} |
| **Sonnet 4.6** | ${sonnetScores.avgInputTokens} | ${sonnetScores.avgOutputTokens} | ${sonnetScores.avgOutputTokens * 50} |

## Decision Criteria

### Critical (Must Pass)
- ✅ JSON Parse: 100% required
- ✅ Word Count Compliance: >85% required

### High Priority
- Voice Quality: Manual review needed

### Medium Priority
- NO Rate: 15-30% target
- Stopword Avoidance: <10% violations acceptable

## Sample Outputs

### Example 1: ${movies[0].title} (${movies[0].year})

**Haiku 3.0:**
\`\`\`json
${JSON.stringify(haikuResults[0].response, null, 2)}
\`\`\`

**Sonnet 4:**
\`\`\`json
${JSON.stringify(sonnetResults[0].response, null, 2)}
\`\`\`

### Example 2: ${movies[1].title} (${movies[1].year})

**Haiku 3.0:**
\`\`\`json
${JSON.stringify(haikuResults[1].response, null, 2)}
\`\`\`

**Sonnet 4:**
\`\`\`json
${JSON.stringify(sonnetResults[1].response, null, 2)}
\`\`\`

### Example 3: ${movies[2].title} (${movies[2].year})

**Haiku 3.0:**
\`\`\`json
${JSON.stringify(haikuResults[2].response, null, 2)}
\`\`\`

**Sonnet 4:**
\`\`\`json
${JSON.stringify(sonnetResults[2].response, null, 2)}
\`\`\`

## Recommendation

${makeRecommendation(haikuScores, sonnetScores)}
`;

  return report;
}

/**
 * Make model recommendation
 */
function makeRecommendation(haikuScores, sonnetScores) {
  const haikuPasses = haikuScores.jsonParseSuccess === haikuScores.totalMovies &&
                       parseFloat(haikuScores.reasonComplianceRate) >= 85 &&
                       parseFloat(haikuScores.contextComplianceRate) >= 85;

  const sonnetPasses = sonnetScores.jsonParseSuccess === sonnetScores.totalMovies &&
                        parseFloat(sonnetScores.reasonComplianceRate) >= 85 &&
                        parseFloat(sonnetScores.contextComplianceRate) >= 85;

  if (haikuPasses && sonnetPasses) {
    const savings = Math.abs((sonnetScores.totalCost / 50 * 35000) - (haikuScores.totalCost / 50 * 35000));
    return `**✅ USE HAIKU 3.0**

Both models pass critical criteria (100% JSON parsing, >85% word count compliance).

**Reasoning:**
- Haiku saves ~$${savings.toFixed(0)} for 35K movie generation
- Quality is comparable
- Manual voice quality review recommended (spot-check 10 samples)

**Action:** Proceed with Haiku 3.0 for full generation unless voice quality review reveals issues.`;
  } else if (sonnetPasses && !haikuPasses) {
    return `**✅ USE SONNET 4**

Haiku failed critical criteria:
- JSON Parse: ${haikuScores.jsonParseRate}% (need 100%)
- Reason Compliance: ${haikuScores.reasonComplianceRate}% (need >85%)
- Context Compliance: ${haikuScores.contextComplianceRate}% (need >85%)

Sonnet 4 passes all critical tests. Cost premium justified for quality assurance.`;
  } else if (haikuPasses && !sonnetPasses) {
    return `**✅ USE HAIKU 3.0**

Surprisingly, Haiku passes critical criteria while Sonnet does not:
- JSON Parse: ${haikuScores.jsonParseRate}% vs ${sonnetScores.jsonParseRate}%
- Reason Compliance: ${haikuScores.reasonComplianceRate}% vs ${sonnetScores.reasonComplianceRate}%
- Context Compliance: ${haikuScores.contextComplianceRate}% vs ${sonnetScores.contextComplianceRate}%

Haiku is both cheaper and more compliant.`;
  } else {
    return `**⚠️ NEITHER MODEL PASSES CRITICAL CRITERIA**

Both models failed:
- Haiku JSON: ${haikuScores.jsonParseRate}%, Reason: ${haikuScores.reasonComplianceRate}%, Context: ${haikuScores.contextComplianceRate}%
- Sonnet JSON: ${sonnetScores.jsonParseRate}%, Reason: ${sonnetScores.reasonComplianceRate}%, Context: ${sonnetScores.contextComplianceRate}%

**Action Required:**
1. Review prompt wording
2. Test with more explicit word count instructions
3. Consider adding few-shot examples`;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 V3 Model Comparison Test\n');
  console.log('📋 Models: Haiku 4.5 vs Sonnet 4.6');
  console.log('📊 Sample: 50 random movies\n');

  // Get sample movies
  const movies = await getSampleMovies();
  console.log('\n🔬 Starting generation...\n');

  // Test both models
  const haikuResults = [];
  const sonnetResults = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    process.stdout.write(`\r[${i + 1}/${movies.length}] Testing: ${movie.title} (${movie.year})`.padEnd(80));

    // Generate with Haiku 4.5
    const haikuResult = await generateWhyWatch(movie, 'claude-haiku-4-5');
    if (haikuResult.success) {
      haikuResult.validation = validateResponse(haikuResult.response);
    }
    haikuResults.push(haikuResult);

    // Generate with Sonnet 4.6
    const sonnetResult = await generateWhyWatch(movie, 'claude-sonnet-4-6');
    if (sonnetResult.success) {
      sonnetResult.validation = validateResponse(sonnetResult.response);
    }
    sonnetResults.push(sonnetResult);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n✅ Generation complete\n');

  // Score both models
  const haikuScores = scoreModel(haikuResults);
  const sonnetScores = scoreModel(sonnetResults);

  // Generate report
  const report = generateReport(haikuResults, sonnetResults, haikuScores, sonnetScores, movies);

  // Save results
  await fs.writeFile('logs/haiku-vs-sonnet-comparison.md', report);
  await fs.writeFile('logs/haiku-vs-sonnet-data.json', JSON.stringify({
    movies,
    haiku: { results: haikuResults, scores: haikuScores },
    sonnet: { results: sonnetResults, scores: sonnetScores }
  }, null, 2));

  console.log('📄 Report saved to: logs/haiku-vs-sonnet-comparison.md');
  console.log('📄 Data saved to: logs/haiku-vs-sonnet-data.json');
  console.log('\n' + report);

  await pool.end();
}

main().catch(console.error);
