#!/usr/bin/env node

/**
 * Test fine-tuned prompt on borderline movies
 * Focus on the "Mixed" category that was getting too many YES votes
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Focus on borderline movies that should be more discriminated
const MIXED_MOVIES = [
  "Batman Forever (1995)",        // Was YES - should be closer to NO
  "Speed 2: Cruise Control (1997)", // Was YES - should likely be NO
  "The Fast and the Furious (2001)", // Was YES - entertainment value
  "Transformers (2007)",          // Was YES - should be borderline
  "Independence Day (1996)",      // Was YES - crowd pleaser
  "Armageddon (1998)",           // Was YES - Michael Bay spectacle
  "Con Air (1997)",              // Was YES - Nicolas Cage fun
  "Face/Off (1997)",             // Was YES - Woo action
  "The Rock (1996)",             // Was YES - solid action
  "Mission: Impossible 2 (2000)", // Was NO - John Woo sequel
  
  // Add some more borderline cases
  "Twilight (2008)",
  "Fifty Shades of Grey (2015)",
  "The Mummy Returns (2001)",
  "Charlie's Angels (2000)",
  "Pearl Harbor (2001)"
];

async function testFineTunedMixed() {
  console.log('🎯 Testing Fine-Tuned Prompt on Borderline Movies');
  console.log('==================================================\n');
  console.log('Target: ~50% YES for mixed/borderline films\n');
  
  const results = { YES: 0, NO: 0 };
  const details = [];
  
  for (let i = 0; i < MIXED_MOVIES.length; i++) {
    const movie = MIXED_MOVIES[i];
    console.log(`[${i + 1}/${MIXED_MOVIES.length}] ${movie}...`);
    
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
      
      console.log(`   ${recommendation === 'YES' ? '✅' : '❌'} ${recommendation}`);
      response.whyWatch.reasons.forEach(reason => {
        console.log(`      • ${reason}`);
      });
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  const total = results.YES + results.NO;
  const yesPercent = ((results.YES / total) * 100).toFixed(1);
  
  console.log('📊 FINE-TUNED RESULTS');
  console.log('=====================');
  console.log(`✅ YES: ${results.YES}/${total} (${yesPercent}%)`);
  console.log(`❌ NO:  ${results.NO}/${total} (${((results.NO / total) * 100).toFixed(1)}%)\n`);
  
  if (yesPercent >= 45 && yesPercent <= 65) {
    console.log('🎯 SUCCESS: Mixed category is properly balanced');
  } else if (yesPercent > 65) {
    console.log('⚠️  Still too generous for borderline films');
  } else {
    console.log('⚠️  Now too harsh for borderline films');
  }
  
  // Show distribution changes
  console.log('\n🔄 KEY CHANGES:');
  console.log('===============');
  const yesMovies = details.filter(d => d.recommendation === 'YES').map(d => d.movie);
  const noMovies = details.filter(d => d.recommendation === 'NO').map(d => d.movie);
  
  if (yesMovies.length > 0) {
    console.log('\n✅ Still getting YES:');
    yesMovies.forEach(movie => console.log(`   ${movie}`));
  }
  
  if (noMovies.length > 0) {
    console.log('\n❌ Now getting NO:');
    noMovies.forEach(movie => console.log(`   ${movie}`));
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testFineTunedMixed().catch(console.error);
}