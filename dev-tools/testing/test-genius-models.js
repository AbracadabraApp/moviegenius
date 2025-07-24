const { Anthropic } = require('@anthropic-ai/sdk');

// Check if running in development
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Import the genius context system
const { CORE_VOICE } = require('./lib/prompts/core.js');
const { GENIUS_CONTEXT } = require('./lib/prompts/contexts.js');

const geniusPrompt = `${CORE_VOICE}

${GENIUS_CONTEXT.structure}`;

const userPrompt = `Create comprehensive educational content about "German Expressionism: The template for noir morality" - exploring how German Expressionist cinema techniques and themes became foundational to film noir's visual style and moral complexity.

CRITICAL LENGTH REQUIREMENTS:
- Write NO LESS THAN 1200 words of PARAGRAPH content (this is MANDATORY)
- Write 8-10 substantial paragraphs of 150-200 words EACH
- Each paragraph should be a mini-essay with rich detail and specific examples
- Treat this as a university-level documentary script - be thorough and comprehensive
- Do NOT write brief summaries - write detailed, expansive analysis
- Include extensive discussion of specific films, directors, and techniques throughout

This is a comprehensive educational piece requiring substantial depth and length.`;

async function testBothModels() {
  console.log('🧪 TESTING GENIUS EPISODE GENERATION\n');
  console.log('Topic: German Expressionism\n');

  try {
    // Debug the actual values being used
    console.log('DEBUG: max_tokens =', GENIUS_CONTEXT.max_tokens);
    console.log('DEBUG: temperature =', GENIUS_CONTEXT.temperature);
    console.log('DEBUG: system prompt length =', geniusPrompt.length, 'chars\n');

    // Test Haiku
    console.log('🔄 Generating with Claude 3.5 Haiku...\n');
    const haikuResponse = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: GENIUS_CONTEXT.max_tokens,
      temperature: GENIUS_CONTEXT.temperature,
      system: geniusPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Test Sonnet
    console.log('🔄 Generating with Claude 3.5 Sonnet...\n');
    const sonnetResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: GENIUS_CONTEXT.max_tokens,
      temperature: GENIUS_CONTEXT.temperature,
      system: geniusPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract content
    const haikuContent = haikuResponse.content[0].text;
    const sonnetContent = sonnetResponse.content[0].text;

    // Parse and compare
    console.log('📊 COMPARISON RESULTS\n');
    console.log('═'.repeat(60));

    // Extract subheads
    const haikuSubheads = haikuContent.match(/SUBHEAD: (.+)/g) || [];
    const sonnetSubheads = sonnetContent.match(/SUBHEAD: (.+)/g) || [];

    console.log('🏷️  SUBHEADS COMPARISON:');
    console.log('─'.repeat(30));
    console.log('HAIKU SUBHEADS:');
    haikuSubheads.forEach((sh, i) => console.log(`${i + 1}. ${sh.replace('SUBHEAD: ', '')}`));
    console.log('\nSONNET SUBHEADS:');
    sonnetSubheads.forEach((sh, i) => console.log(`${i + 1}. ${sh.replace('SUBHEAD: ', '')}`));

    // Extract explore further
    const haikuExplore = haikuContent.match(/EXPLORE_FURTHER: (.+)/g) || [];
    const sonnetExplore = sonnetContent.match(/EXPLORE_FURTHER: (.+)/g) || [];

    console.log('\n🔍 EXPLORE FURTHER COMPARISON:');
    console.log('─'.repeat(30));
    console.log('HAIKU EXPLORE FURTHER:');
    haikuExplore.forEach((ex, i) =>
      console.log(`${i + 1}. ${ex.replace('EXPLORE_FURTHER: ', '')}`)
    );
    console.log('\nSONNET EXPLORE FURTHER:');
    sonnetExplore.forEach((ex, i) =>
      console.log(`${i + 1}. ${ex.replace('EXPLORE_FURTHER: ', '')}`)
    );

    // Word counts - extract only PARAGRAPH content
    function extractParagraphWords(content) {
      const lines = content.split('\n');
      const paragraphLines = lines.filter(line => line.trim().startsWith('PARAGRAPH:'));

      // Debug: Show what we're finding
      console.log(`DEBUG: Found ${paragraphLines.length} PARAGRAPH lines`);
      if (paragraphLines.length < 3) {
        console.log('DEBUG: First 10 lines of content:');
        lines.slice(0, 10).forEach((line, i) => console.log(`  ${i + 1}: "${line}"`));
      }

      const paragraphText = paragraphLines
        .map(line => line.replace(/^PARAGRAPH:\s*/, '').trim())
        .join(' ');
      return paragraphText.split(/\s+/).filter(word => word.length > 0).length;
    }

    const haikuWords = extractParagraphWords(haikuContent);
    const sonnetWords = extractParagraphWords(sonnetContent);
    const haikuTotalWords = haikuContent.split(/\s+/).length;
    const sonnetTotalWords = sonnetContent.split(/\s+/).length;

    // Scoring functions
    function scoreExploreFurther(exploreItems) {
      const items = exploreItems.map(item => item.replace('EXPLORE_FURTHER: ', ''));
      let qualityScore = 0;
      let relevanceScore = 0;
      let specificityScore = 0;

      items.forEach(item => {
        // Quality: interesting and accessible
        if (item.includes('technique') || item.includes('influence') || item.includes('evolution'))
          qualityScore += 0.5;
        if (!item.toLowerCase().includes('how did') && !item.toLowerCase().includes('what is'))
          qualityScore += 0.5;

        // Relevance: extends naturally from content
        if (
          item.includes('German') ||
          item.includes('Expressionism') ||
          item.includes('noir') ||
          item.includes('lighting') ||
          item.includes('émigré')
        )
          relevanceScore += 1;

        // Specificity: avoid generic questions
        if (!item.toLowerCase().includes('how did x influence y') && item.length > 30)
          specificityScore += 1;
      });

      return {
        quality: Math.min((qualityScore / items.length) * 10, 10),
        relevance: Math.min((relevanceScore / items.length) * 10, 10),
        specificity: Math.min((specificityScore / items.length) * 10, 10),
      };
    }

    function scoreSubheads(subheadItems) {
      const items = subheadItems.map(item => item.replace('SUBHEAD: ', ''));
      let organizationScore = 0;
      let clarityScore = 0;
      let engagementScore = 0;
      let logicScore = 0;

      items.forEach((item, index) => {
        // Natural organization: thematic shifts
        if (
          item.includes('Visual') ||
          item.includes('Psychological') ||
          item.includes('Technical') ||
          item.includes('Influence')
        )
          organizationScore += 1;

        // Clarity: help readers navigate
        if (item.length < 50 && item.length > 10) clarityScore += 1;

        // Engagement: intriguing rather than academic
        if (
          !item.includes('Analysis') &&
          !item.includes('Overview') &&
          !item.includes('Introduction')
        )
          engagementScore += 1;

        // Logic: coherent progression (later subheads should build)
        if (
          index > 0 &&
          (item.includes('Influence') || item.includes('Legacy') || item.includes('Evolution'))
        )
          logicScore += 1;
      });

      return items.length > 0
        ? {
            organization: Math.min((organizationScore / items.length) * 10, 10),
            clarity: Math.min((clarityScore / items.length) * 10, 10),
            engagement: Math.min((engagementScore / items.length) * 10, 10),
            logic: items.length > 1 ? Math.min((logicScore / (items.length - 1)) * 10, 10) : 5,
          }
        : { organization: 0, clarity: 0, engagement: 0, logic: 0 };
    }

    // Calculate scores
    const haikuExploreScore = scoreExploreFurther(haikuExplore);
    const sonnetExploreScore = scoreExploreFurther(sonnetExplore);
    const haikuSubheadScore = scoreSubheads(haikuSubheads);
    const sonnetSubheadScore = scoreSubheads(sonnetSubheads);

    console.log('\n📏 LENGTH & READABILITY:');
    console.log('─'.repeat(30));
    console.log(`HAIKU PARAGRAPH WORDS: ${haikuWords} (Total: ${haikuTotalWords})`);
    console.log(`SONNET PARAGRAPH WORDS: ${sonnetWords} (Total: ${sonnetTotalWords})`);
    console.log(`TARGET: 1200+ paragraph words`);

    console.log('\n🎯 EXPLORE FURTHER SCORING:');
    console.log('─'.repeat(30));
    console.log('HAIKU SCORES:');
    console.log(`  Quality: ${haikuExploreScore.quality.toFixed(1)}/10`);
    console.log(`  Relevance: ${haikuExploreScore.relevance.toFixed(1)}/10`);
    console.log(`  Specificity: ${haikuExploreScore.specificity.toFixed(1)}/10`);
    console.log('SONNET SCORES:');
    console.log(`  Quality: ${sonnetExploreScore.quality.toFixed(1)}/10`);
    console.log(`  Relevance: ${sonnetExploreScore.relevance.toFixed(1)}/10`);
    console.log(`  Specificity: ${sonnetExploreScore.specificity.toFixed(1)}/10`);

    console.log('\n📚 SUBHEAD SCORING:');
    console.log('─'.repeat(30));
    console.log('HAIKU SCORES:');
    console.log(`  Organization: ${haikuSubheadScore.organization.toFixed(1)}/10`);
    console.log(`  Clarity: ${haikuSubheadScore.clarity.toFixed(1)}/10`);
    console.log(`  Engagement: ${haikuSubheadScore.engagement.toFixed(1)}/10`);
    console.log(`  Logic: ${haikuSubheadScore.logic.toFixed(1)}/10`);
    console.log('SONNET SCORES:');
    console.log(`  Organization: ${sonnetSubheadScore.organization.toFixed(1)}/10`);
    console.log(`  Clarity: ${sonnetSubheadScore.clarity.toFixed(1)}/10`);
    console.log(`  Engagement: ${sonnetSubheadScore.engagement.toFixed(1)}/10`);
    console.log(`  Logic: ${sonnetSubheadScore.logic.toFixed(1)}/10`);

    console.log('\n═'.repeat(60));
    console.log('✅ Test completed! Compare subheads and explore further quality above.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBothModels();
