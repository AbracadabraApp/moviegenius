#!/usr/bin/env node

/**
 * Test adjusted prompt distribution - aiming for ~70% YES
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Mix of quality levels - same movies from previous test for comparison
const TEST_MOVIES = [
  // High quality (should be YES)
  "Back to the Future (1985)",
  "The Lord of the Rings: The Fellowship of the Ring (2001)", 
  "Paths of Glory (1957)",
  
  // Good (should be YES)
  "Top Gun (1986)",
  "The Sixth Sense (1999)",
  "Casino (1995)",
  
  // Average/Mixed (now should lean YES with adjusted prompt)
  "Batman & Robin (1997)", // Was NO at 4.378 TMDB
  "The Mask (1994)",       // Was YES at higher rating
  "Over the Top (1987)",   // Was NO - mediocre Stallone
  "Cool as Ice (1991)",    // Was NO - Vanilla Ice movie
  
  // Genuinely bad (should still be NO)
  "The Foreigner (2003)",  // Was NO at 3.9 TMDB
  "Hooking Up (2009)"      // Was NO at 3.1 TMDB
];

async function testAdjustedDistribution() {
  console.log('🎯 Testing Adjusted Distribution (Target: ~70% YES)');
  console.log('===================================================\n');
  
  const results = { YES: 0, NO: 0 };
  const details = [];
  
  for (let i = 0; i < TEST_MOVIES.length; i++) {
    const movie = TEST_MOVIES[i];
    console.log(`[${i + 1}/${TEST_MOVIES.length}] ${movie}...`);
    
    try {
      const prompt = buildWhyWatchPrompt(movie, {});
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: prompt,
            cache_control: { type: 'ephemeral' }
          }]
        }],
      });

      const response = JSON.parse(message.content[0].text);
      const recommendation = response.whyWatch.recommendation;
      
      results[recommendation]++;
      details.push({
        movie,
        recommendation,
        reasons: response.whyWatch.reasons
      });
      
      console.log(`   ${recommendation === 'YES' ? '✅' : '❌'} ${recommendation}: ${response.whyWatch.reasons.join(' | ')}\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  const total = results.YES + results.NO;
  const yesPercent = ((results.YES / total) * 100).toFixed(1);
  
  console.log('📊 ADJUSTED DISTRIBUTION RESULTS');
  console.log('================================');
  console.log(`✅ YES: ${results.YES}/${total} (${yesPercent}%)`);
  console.log(`❌ NO:  ${results.NO}/${total} (${((results.NO / total) * 100).toFixed(1)}%)\n`);
  
  // Show what changed
  console.log('🔄 KEY CHANGES FROM PREVIOUS TEST:');
  console.log('==================================');
  console.log('Movies that should flip from NO to YES with adjusted prompt:');
  console.log('- Batman & Robin (1997) - Previous NO, target YES');
  console.log('- Over the Top (1987) - Previous NO, target YES');
  console.log('- Cool as Ice (1991) - Previous NO, target YES\n');
  
  console.log('Movies that should remain NO:');
  console.log('- The Foreigner (2003) - Genuinely terrible');
  console.log('- Hooking Up (2009) - Low quality\n');
  
  if (yesPercent >= 65 && yesPercent <= 75) {
    console.log('🎯 SUCCESS: Distribution is within target range (65-75% YES)');
  } else if (yesPercent < 65) {
    console.log('⚠️  Still too harsh - need to be more generous');
  } else {
    console.log('⚠️  Too generous - tighten standards slightly');
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testAdjustedDistribution().catch(console.error);
}