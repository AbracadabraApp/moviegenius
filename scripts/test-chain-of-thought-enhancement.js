/**
 * A/B Test: Chain-of-Thought Enhancement for Movie Analysis Prompt
 * 
 * Compares current MOVIE_ANALYSIS_CONTEXT vs enhanced version with thinking section
 * to measure impact on quality, word count adherence, and critical assessment.
 */

import { buildPrompt } from '../lib/prompts/builder.js';
import { CONTEXTS } from '../lib/prompts/contexts.js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Enhanced context with chain-of-thought thinking section
const ENHANCED_MOVIE_ANALYSIS_CONTEXT = {
  ...CONTEXTS.MOVIE_ANALYSIS,
  structure: `You are an expert film analyst generating focused analysis for movie enthusiasts who want context and connections.

Here is the title of the film you need to analyze:

<film_title>
{{FILM_TITLE}}
</film_title>

Before generating your analysis, think through your approach:

<thinking>
- What are the key aspects that make this film significant?
- Which 4-6 comparison films will provide the best context?
- How can I balance critical assessment with appreciation?
- What specific scenes or technical elements should I highlight?
- CRITICAL STANCE: I am providing film criticism, not advertising - I should include honest flaws and limitations alongside strengths
- What doesn't work in this film? What are its weaknesses or controversial aspects?
- WORD COUNT TARGET: I need 375-425 words in CONTENT TEXT ONLY (not counting JSON structure, metadata, or field names) - roughly 95-110 words per section across 4 content sections
</thinking>

CRITICAL WORD COUNT INSTRUCTION: The 375-425 word target applies ONLY to the combined text within the FOUR "content" section objects. Do NOT count JSON structure, field names, metadata, featuredMovies, or linkedReferences toward your word count. Only count the actual analysis text in the four content.text fields.

Your goal is to produce a contextual analysis that gets right into the movie's world and significance.

CRITICAL: Your response must contain ONLY the JSON structure specified below. Do not include any explanatory text outside the JSON.

Guidelines for Contextual Analysis:

1. Content Focus (375-425 words total - concise and focused):
- FIRST section: Jump right into the plot, main characters, and what makes this story compelling. No movie references required - focus on the story itself.
- SECOND section: Focus on key performances and acting. Include 1-2 movie references when natural for comparison. Add 1 sentence of honest critique about performance weaknesses.
- THIRD section: Director's vision, cinematography, and technical elements. Include 1-2 movie references for stylistic context. Add 1 sentence of honest critique about technical execution.
- FOURTH section: Social importance, entertainment value, cultural impact, and contemporary relevance. Include 2-3 movie references for cultural/genre context. Add 1 sentence of honest critique about genre execution or relevance limitations.
- NATURAL DISTRIBUTION: References flow organically through sections 2-4, not forced into every section
- Provide HONEST critique integrated into sections 2-4 - not everything about every film is perfect
- Be more detailed and comprehensive - four sections allow for deeper analysis

BANNED SUPERFICIAL PRAISE WORDS (unless truly exceptional):
- "Masterful" / "Master" / "Masterclass" - only use for genuine masterpieces
- "Expertly" - overused adverb for any competent work
- "Rich tapestry" - pretentious cliché for ensemble cast
- "Breakout" - overused for any notable performance  
- "Stunning" / "Breathtaking" - generic visual praise
- "Compelling" / "Captivating" - meaningless filler
- "Riveting" / "Gripping" - thriller clichés
- "Tour de force" - pretentious unless warranted
- "Powerhouse" performance - overused superlative
- "Seamlessly" - lazy transition word
- "Effortlessly" - assumes no work was involved
Use specific, earned descriptors instead of empty superlatives

2. Movie References Strategy:
- Reference 4-6 different films throughout the analysis (more comprehensive coverage)
- DISTRIBUTE organically: 0 in section 1, 1-2 in section 2, 1-2 in section 3, 2-3 in section 4
- Include films that influenced it AND films it influenced when relevant
- Show genre evolution and cultural connections in section 4
- Use **Film Title** (year) format consistently
- Vary relationship types: influenced_by, similar_to, genre_evolution, cultural_parallel

3. Comprehensive Analysis Focus:
- Why is this entertaining? What makes it engaging?
- What social themes or cultural moments does it capture?
- How does it reflect or challenge its era's values?
- Contemporary relevance - why does it matter to today's audiences?
- Genre context - how does this fit within its genre? What does it bring that's new or essential?
- Be honest about controversial aspects, problematic elements, or divisive reception
- Remember: Critical assessment is integrated into sections 2, 3, and 4


Your response must contain ONLY this JSON structure:

IMPORTANT: Fill the "wordCount" field by manually counting ONLY the words in your FOUR content.text sections combined. Do not count JSON structure, field names, or metadata.

{
  "metadata": {
    "title": "",
    "year": 0,
    "analysisType": "contextual",
    "wordCount": 0,
    "targetRange": "375-425"
  },
  "keyElements": {
    "director": "",
    "writers": [],
    "stars": [],
    "genre": "",
    "releaseYear": 0,
    "cinematographer": "",
    "composer": "",
    "studio": ""
  },
  "content": [
    {
      "type": "plotAndCharacters", 
      "text": ""
    },
    {
      "type": "performancesAndActing",
      "text": ""
    },
    {
      "type": "directionAndTechnicalElements",
      "text": ""
    },
    {
      "type": "socialCulturalAndRelevance",
      "text": ""
    }
  ],
  "featuredMovies": [
    {
      "title": "",
      "year": 0,
      "description": ""
    }
  ],
  "linkedReferences": [
    {
      "type": "",
      "title": "",
      "year": 0,
      "originalText": "",
      "relationship": "",
      "importance": 1
    }
  ],
  "generationMetadata": {
    "timestamp": "",
    "processingTime": 0,
    "version": "2.0"
  }
}

Ensure all JSON is valid and properly structured. Your final output should consist only of the JSON, without any additional commentary or wrapper text.

Note: The user prompt will contain only the film title and year in the format "Film Title (Year)".`
};

/**
 * Test both prompt versions on the same movie
 */
async function runComparisonTest(movieTitle, movieYear) {
  const testMovie = `${movieTitle} (${movieYear})`;
  console.log(`🎬 Testing: ${testMovie}`);
  console.log(`📊 Comparing Original vs Chain-of-Thought Enhanced prompt\n`);

  const results = {
    testMovie,
    timestamp: new Date().toISOString(),
    original: null,
    enhanced: null,
    comparison: null
  };

  try {
    // Test 1: Original prompt
    console.log('🔵 Testing Original Prompt...');
    const originalPrompt = buildPrompt('MOVIE_ANALYSIS', '', false);
    const originalStart = Date.now();
    
    const originalResponse = await anthropic.messages.create({
      ...originalPrompt,
      messages: [{ role: 'user', content: testMovie }],
    });
    
    const originalTime = Date.now() - originalStart;
    const originalContent = originalResponse.content[0].text;
    
    results.original = {
      content: originalContent,
      usage: originalResponse.usage,
      processingTime: originalTime,
      cost: (originalResponse.usage.input_tokens * 0.003 + originalResponse.usage.output_tokens * 0.015) / 1000
    };

    // Test 2: Enhanced prompt with chain-of-thought + 4 sections + explicit word counting
    console.log('🟡 Testing Enhanced Prompt with Chain-of-Thought + 4 Sections + Explicit Word Count Instructions...');
    
    // Create enhanced prompt configuration
    const enhancedPrompt = {
      ...originalPrompt,
      system: [{
        type: 'text',
        text: originalPrompt.system[0].text.replace(
          CONTEXTS.MOVIE_ANALYSIS.structure,
          ENHANCED_MOVIE_ANALYSIS_CONTEXT.structure
        ),
        cache_control: { type: 'ephemeral' }
      }]
    };
    
    const enhancedStart = Date.now();
    const enhancedResponse = await anthropic.messages.create({
      ...enhancedPrompt,
      messages: [{ role: 'user', content: testMovie }],
    });
    
    const enhancedTime = Date.now() - enhancedStart;
    const enhancedContent = enhancedResponse.content[0].text;
    
    results.enhanced = {
      content: enhancedContent,
      usage: enhancedResponse.usage,
      processingTime: enhancedTime,
      cost: (enhancedResponse.usage.input_tokens * 0.003 + enhancedResponse.usage.output_tokens * 0.015) / 1000
    };

    // Analyze and compare results
    results.comparison = compareResults(results.original, results.enhanced);
    
    // Save results
    const filename = `prompt-comparison-${movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    
    console.log('\n📈 COMPARISON RESULTS:');
    console.log('=====================');
    displayComparison(results.comparison);
    console.log(`\n💾 Detailed results saved to: ${filename}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.error = error.message;
  }

  return results;
}

/**
 * Compare the two analysis results
 */
function compareResults(original, enhanced) {
  const comparison = {
    wordCount: { original: 0, enhanced: 0, difference: 0 },
    filmReferences: { original: 0, enhanced: 0, difference: 0 },
    linkedTitles: { original: 0, enhanced: 0, difference: 0 },
    linkedNames: { original: 0, enhanced: 0, difference: 0 },
    featuredMovies: { original: 0, enhanced: 0, difference: 0 },
    jsonValid: { original: false, enhanced: false },
    processingTime: { original: original.processingTime, enhanced: enhanced.processingTime, difference: 0 },
    cost: { original: original.cost, enhanced: enhanced.cost, difference: 0 },
    costBreakdown: { 
      original: { input: 0, output: 0, caching: 'enabled' }, 
      enhanced: { input: 0, output: 0, caching: 'enabled' }
    },
    model: { original: 'claude-3-5-sonnet-20241022', enhanced: 'claude-3-5-sonnet-20241022' },
    structure: { original: null, enhanced: null },
    qualitativeMetrics: { original: {}, enhanced: {} }
  };

  // Parse and analyze original
  try {
    const originalJson = JSON.parse(original.content);
    comparison.jsonValid.original = true;
    comparison.structure.original = originalJson;
    
    // Count words across content sections
    const originalWords = originalJson.content.reduce((total, section) => 
      total + section.text.split(/\s+/).length, 0
    );
    comparison.wordCount.original = originalWords;
    
    // Count film references in text
    const originalRefs = (original.content.match(/\*\*[^*]+\*\*\s*\(\d{4}\)/g) || []).length;
    comparison.filmReferences.original = originalRefs;
    
    // Count linked references and featured movies
    comparison.linkedTitles.original = (originalJson.linkedReferences || []).filter(ref => ref.type === 'movie').length;
    comparison.linkedNames.original = (originalJson.linkedReferences || []).filter(ref => ref.type === 'person').length;
    comparison.featuredMovies.original = (originalJson.featuredMovies || []).length;
    
    // Cost breakdown
    comparison.costBreakdown.original.input = (original.usage.input_tokens * 0.003) / 1000;
    comparison.costBreakdown.original.output = (original.usage.output_tokens * 0.015) / 1000;
    
    // Qualitative metrics
    comparison.qualitativeMetrics.original = {
      hasSpecificScenes: /scene where|in the scene|opening scene|sequence where/gi.test(original.content),
      hasTechnicalDetails: /cinematography|camera|lighting|sound|editing/gi.test(original.content),
      hasCulturalContext: /culture|cultural|society|social|influence|impact/gi.test(original.content),
      criticalAssessment: /however|but|despite|weakness|flaw|problem|issue/gi.test(original.content),
      decadeSpread: [...new Set((original.content.match(/\((\d{4})\)/g) || []).map(y => Math.floor(parseInt(y.replace(/[()]/g, '')) / 10) * 10))].length
    };
    
  } catch (e) {
    console.warn('⚠️ Original analysis JSON parsing failed');
  }

  // Parse and analyze enhanced
  try {
    const enhancedJson = JSON.parse(enhanced.content);
    comparison.jsonValid.enhanced = true;
    comparison.structure.enhanced = enhancedJson;
    
    // Count words across content sections
    const enhancedWords = enhancedJson.content.reduce((total, section) => 
      total + section.text.split(/\s+/).length, 0
    );
    comparison.wordCount.enhanced = enhancedWords;
    
    // Count film references in text
    const enhancedRefs = (enhanced.content.match(/\*\*[^*]+\*\*\s*\(\d{4}\)/g) || []).length;
    comparison.filmReferences.enhanced = enhancedRefs;
    
    // Count linked references and featured movies
    comparison.linkedTitles.enhanced = (enhancedJson.linkedReferences || []).filter(ref => ref.type === 'movie').length;
    comparison.linkedNames.enhanced = (enhancedJson.linkedReferences || []).filter(ref => ref.type === 'person').length;
    comparison.featuredMovies.enhanced = (enhancedJson.featuredMovies || []).length;
    
    // Cost breakdown
    comparison.costBreakdown.enhanced.input = (enhanced.usage.input_tokens * 0.003) / 1000;
    comparison.costBreakdown.enhanced.output = (enhanced.usage.output_tokens * 0.015) / 1000;
    
    // Qualitative metrics
    comparison.qualitativeMetrics.enhanced = {
      hasSpecificScenes: /scene where|in the scene|opening scene|sequence where/gi.test(enhanced.content),
      hasTechnicalDetails: /cinematography|camera|lighting|sound|editing/gi.test(enhanced.content),
      hasCulturalContext: /culture|cultural|society|social|influence|impact/gi.test(enhanced.content),
      criticalAssessment: /however|but|despite|weakness|flaw|problem|issue/gi.test(enhanced.content),
      decadeSpread: [...new Set((enhanced.content.match(/\((\d{4})\)/g) || []).map(y => Math.floor(parseInt(y.replace(/[()]/g, '')) / 10) * 10))].length
    };
    
  } catch (e) {
    console.warn('⚠️ Enhanced analysis JSON parsing failed');
  }

  // Calculate differences
  comparison.wordCount.difference = comparison.wordCount.enhanced - comparison.wordCount.original;
  comparison.filmReferences.difference = comparison.filmReferences.enhanced - comparison.filmReferences.original;
  comparison.linkedTitles.difference = comparison.linkedTitles.enhanced - comparison.linkedTitles.original;
  comparison.linkedNames.difference = comparison.linkedNames.enhanced - comparison.linkedNames.original;
  comparison.featuredMovies.difference = comparison.featuredMovies.enhanced - comparison.featuredMovies.original;
  comparison.processingTime.difference = enhanced.processingTime - original.processingTime;
  comparison.cost.difference = enhanced.cost - original.cost;

  return comparison;
}

/**
 * Display comparison results
 */
function displayComparison(comparison) {
  console.log(`Word Count:`);
  console.log(`  Original: ${comparison.wordCount.original} words`);
  console.log(`  Enhanced: ${comparison.wordCount.enhanced} words`);
  console.log(`  Target: 375-425 words (Enhanced) vs 400-550 (Original)`);
  console.log(`  Difference: ${comparison.wordCount.difference > 0 ? '+' : ''}${comparison.wordCount.difference} words`);
  
  console.log(`\nFilm References:`);
  console.log(`  Original: ${comparison.filmReferences.original} references`);
  console.log(`  Enhanced: ${comparison.filmReferences.enhanced} references`);
  console.log(`  Difference: ${comparison.filmReferences.difference > 0 ? '+' : ''}${comparison.filmReferences.difference} references`);
  
  console.log(`\nLinked Entities:`);
  console.log(`  Original: ${comparison.linkedTitles.original} movies, ${comparison.linkedNames.original} people`);
  console.log(`  Enhanced: ${comparison.linkedTitles.enhanced} movies, ${comparison.linkedNames.enhanced} people`);
  console.log(`  Difference: ${comparison.linkedTitles.difference > 0 ? '+' : ''}${comparison.linkedTitles.difference} movies, ${comparison.linkedNames.difference > 0 ? '+' : ''}${comparison.linkedNames.difference} people`);
  
  console.log(`\nFeatured Movies:`);
  console.log(`  Original: ${comparison.featuredMovies.original} curated films`);
  console.log(`  Enhanced: ${comparison.featuredMovies.enhanced} curated films`);
  console.log(`  Difference: ${comparison.featuredMovies.difference > 0 ? '+' : ''}${comparison.featuredMovies.difference} films`);
  
  console.log(`\nJSON Validity:`);
  console.log(`  Original: ${comparison.jsonValid.original ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`  Enhanced: ${comparison.jsonValid.enhanced ? '✅ Valid' : '❌ Invalid'}`);
  
  console.log(`\nProcessing Performance:`);
  console.log(`  Original: ${comparison.processingTime.original}ms`);
  console.log(`  Enhanced: ${comparison.processingTime.enhanced}ms`);
  console.log(`  Difference: ${comparison.processingTime.difference > 0 ? '+' : ''}${comparison.processingTime.difference}ms`);
  console.log(`  Model: ${comparison.model.original} (both versions)`);
  
  console.log(`\nCost Breakdown (with caching enabled):`);
  console.log(`  Original: $${comparison.cost.original.toFixed(4)} (Input: $${comparison.costBreakdown.original.input.toFixed(4)}, Output: $${comparison.costBreakdown.original.output.toFixed(4)})`);
  console.log(`  Enhanced: $${comparison.cost.enhanced.toFixed(4)} (Input: $${comparison.costBreakdown.enhanced.input.toFixed(4)}, Output: $${comparison.costBreakdown.enhanced.output.toFixed(4)})`);
  console.log(`  Difference: ${comparison.cost.difference > 0 ? '+' : ''}$${comparison.cost.difference.toFixed(4)}`);
  console.log(`  Scale Impact (21,275 analyses): ${comparison.cost.difference > 0 ? '+' : ''}$${(comparison.cost.difference * 21275).toFixed(2)}`);
  
  // Word count target adherence
  const originalInTarget = comparison.wordCount.original >= 400 && comparison.wordCount.original <= 550;
  const enhancedInTarget = comparison.wordCount.enhanced >= 375 && comparison.wordCount.enhanced <= 425;
  
  console.log(`\nTarget Range Adherence:`);
  console.log(`  Original (400-550): ${originalInTarget ? '✅ In range' : '❌ Out of range'}`);
  console.log(`  Enhanced (375-425): ${enhancedInTarget ? '✅ In range' : '❌ Out of range'}`);
  
  // Qualitative Analysis
  console.log(`\nQualitative Metrics:`);
  if (comparison.qualitativeMetrics.original && comparison.qualitativeMetrics.enhanced) {
    const orig = comparison.qualitativeMetrics.original;
    const enh = comparison.qualitativeMetrics.enhanced;
    console.log(`  Specific Scenes: Original ${orig.hasSpecificScenes ? '✅' : '❌'}, Enhanced ${enh.hasSpecificScenes ? '✅' : '❌'}`);
    console.log(`  Technical Depth: Original ${orig.hasTechnicalDetails ? '✅' : '❌'}, Enhanced ${enh.hasTechnicalDetails ? '✅' : '❌'}`);
    console.log(`  Cultural Context: Original ${orig.hasCulturalContext ? '✅' : '❌'}, Enhanced ${enh.hasCulturalContext ? '✅' : '❌'}`);
    console.log(`  Critical Assessment: Original ${orig.criticalAssessment ? '✅' : '❌'}, Enhanced ${enh.criticalAssessment ? '✅' : '❌'}`);
    console.log(`  Decade Spread: Original ${orig.decadeSpread}, Enhanced ${enh.decadeSpread} decades`);
  }
}

// Test with a less commonly analyzed film (5-10k popularity range)
const TEST_MOVIE_TITLE = 'After Hours';
const TEST_MOVIE_YEAR = 1985;

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComparisonTest(TEST_MOVIE_TITLE, TEST_MOVIE_YEAR)
    .then(() => {
      console.log('\n✅ A/B test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { runComparisonTest, ENHANCED_MOVIE_ANALYSIS_CONTEXT };