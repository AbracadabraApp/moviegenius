#!/usr/bin/env node

/**
 * Test YES/NO distribution on realistic movie sample
 * Includes many average/mediocre films people actually encounter
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Realistic sample - mostly average movies people actually encounter
const REALISTIC_SAMPLE = [
  // A few genuine classics (10%)
  "The Godfather (1972)",
  "Pulp Fiction (1994)",
  
  // Recent blockbusters (20%) - mixed quality
  "Avengers: Endgame (2019)",
  "Top Gun: Maverick (2022)", 
  "Spider-Man: No Way Home (2021)",
  "Fast X (2023)",
  
  // Netflix/streaming originals (20%) - often mediocre
  "Red Notice (2021)",
  "The Gray Man (2022)", 
  "6 Underground (2019)",
  "Bright (2017)",
  
  // Horror movies (15%) - wide quality range
  "The Nun (2018)",
  "Halloween Kills (2021)",
  "Scream (2022)",
  
  // Action/Thriller mid-budget (15%) - usually forgettable  
  "The Commuter (2018)",
  "Mile 22 (2018)",
  "Angel Has Fallen (2019)",
  
  // Romantic comedies (10%) - often formulaic
  "Isn't It Romantic (2019)",
  "The Perfect Date (2019)",
  
  // Genuinely bad films (10%)
  "The Emoji Movie (2017)",
  "Cats (2019)"
];

async function testRealisticDistribution() {
  console.log('🎯 Realistic Movie Distribution Test');
  console.log('====================================\n');
  console.log('Testing sample that reflects what people actually watch...\n');
  
  const results = { YES: 0, NO: 0, total: 0 };
  const details = [];
  
  for (let i = 0; i < REALISTIC_SAMPLE.length; i++) {
    const movie = REALISTIC_SAMPLE[i];
    process.stdout.write(`\r[${i + 1}/${REALISTIC_SAMPLE.length}] ${movie}...`);
    
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
      results.total++;
      
      details.push({
        movie,
        recommendation,
        reasons: response.whyWatch.reasons
      });
      
    } catch (error) {
      console.log(`\n❌ Error with ${movie}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n\n📊 REALISTIC DISTRIBUTION');
  console.log('=========================\n');
  
  const yesPercent = ((results.YES / results.total) * 100).toFixed(1);
  const noPercent = ((results.NO / results.total) * 100).toFixed(1);
  
  console.log(`✅ YES: ${results.YES}/${results.total} (${yesPercent}%)`);
  console.log(`❌ NO:  ${results.NO}/${results.total} (${noPercent}%)\n`);
  
  console.log('📝 Sample Results:');
  console.log('==================');
  
  // Show YES examples
  const yesExamples = details.filter(d => d.recommendation === 'YES').slice(0, 3);
  console.log('\n✅ YES Examples:');
  yesExamples.forEach(detail => {
    console.log(`   ${detail.movie}`);
    detail.reasons.forEach(reason => console.log(`      • ${reason}`));
  });
  
  // Show NO examples  
  const noExamples = details.filter(d => d.recommendation === 'NO').slice(0, 3);
  console.log('\n❌ NO Examples:');
  noExamples.forEach(detail => {
    console.log(`   ${detail.movie}`);
    detail.reasons.forEach(reason => console.log(`      • ${reason}`));
  });
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testRealisticDistribution().catch(console.error);
}