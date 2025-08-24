#!/usr/bin/env node

/**
 * Final validation of adjusted Why Watch prompt
 * Test on 50 diverse movies to validate 70% YES target
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Diverse 50-movie sample across quality spectrum
const VALIDATION_MOVIES = [
  // Definite YES - Acclaimed films (15 movies)
  "The Shawshank Redemption (1994)",
  "The Godfather (1972)",
  "Pulp Fiction (1994)",
  "Schindler's List (1993)",
  "Goodfellas (1990)",
  "The Dark Knight (2008)",
  "12 Angry Men (1957)",
  "Forrest Gump (1994)",
  "Fight Club (1999)",
  "Inception (2010)",
  "The Matrix (1999)",
  "Casablanca (1942)",
  "One Flew Over the Cuckoo's Nest (1975)",
  "Se7en (1995)",
  "Silence of the Lambs (1991)",
  
  // Should be YES - Popular/entertaining (20 movies)
  "Jurassic Park (1993)",
  "Terminator 2 (1991)",
  "Die Hard (1988)",
  "Back to the Future (1985)",
  "Raiders of the Lost Ark (1981)",
  "Alien (1979)",
  "Jaws (1975)",
  "Star Wars (1977)",
  "E.T. (1982)",
  "Ghostbusters (1984)",
  "Top Gun (1986)",
  "Pretty Woman (1990)",
  "Home Alone (1990)",
  "The Lion King (1994)",
  "Titanic (1997)",
  "Avatar (2009)",
  "The Avengers (2012)",
  "Iron Man (2008)",
  "Wonder Woman (2017)",
  "Black Panther (2018)",
  
  // Mixed/Borderline - Could go either way (10 movies)
  "Batman Forever (1995)",
  "Speed 2: Cruise Control (1997)",
  "The Fast and the Furious (2001)",
  "Transformers (2007)",
  "Independence Day (1996)",
  "Armageddon (1998)",
  "Con Air (1997)",
  "Face/Off (1997)",
  "The Rock (1996)",
  "Mission: Impossible 2 (2000)",
  
  // Should be NO - Genuinely bad (5 movies)
  "Batman & Robin (1997)",
  "The Room (2003)",
  "Battlefield Earth (2000)",
  "Catwoman (2004)",
  "The Last Airbender (2010)"
];

async function runFinalValidation() {
  console.log('🎯 FINAL VALIDATION - Adjusted Why Watch Prompt');
  console.log('================================================\n');
  console.log(`Testing ${VALIDATION_MOVIES.length} movies to validate ~70% YES target...\n`);
  
  const results = { YES: 0, NO: 0, errors: 0 };
  const categories = {
    'Acclaimed': { YES: 0, NO: 0 },
    'Popular': { YES: 0, NO: 0 },
    'Mixed': { YES: 0, NO: 0 },
    'Bad': { YES: 0, NO: 0 }
  };
  
  let totalCost = 0;
  
  for (let i = 0; i < VALIDATION_MOVIES.length; i++) {
    const movie = VALIDATION_MOVIES[i];
    process.stdout.write(`\r[${i + 1}/${VALIDATION_MOVIES.length}] ${movie}...`);
    
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
      totalCost += (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
      
      // Categorize movies
      let category;
      if (i < 15) category = 'Acclaimed';
      else if (i < 35) category = 'Popular';
      else if (i < 45) category = 'Mixed';
      else category = 'Bad';
      
      categories[category][recommendation]++;
      
    } catch (error) {
      results.errors++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  const total = results.YES + results.NO;
  const yesPercent = ((results.YES / total) * 100).toFixed(1);
  
  console.log('\n\n📊 FINAL VALIDATION RESULTS');
  console.log('===========================\n');
  
  console.log(`✅ YES: ${results.YES}/${total} (${yesPercent}%)`);
  console.log(`❌ NO:  ${results.NO}/${total} (${((results.NO / total) * 100).toFixed(1)}%)`);
  if (results.errors > 0) {
    console.log(`❗ Errors: ${results.errors}`);
  }
  
  console.log('\n📈 BY CATEGORY:');
  console.log('===============');
  Object.entries(categories).forEach(([category, counts]) => {
    const catTotal = counts.YES + counts.NO;
    if (catTotal > 0) {
      const yesRate = ((counts.YES / catTotal) * 100).toFixed(0);
      console.log(`${category.padEnd(10)}: ${counts.YES}Y/${counts.NO}N (${yesRate}% YES)`);
    }
  });
  
  console.log(`\n💰 Total Cost: $${totalCost.toFixed(3)}`);
  
  // Validation assessment
  console.log('\n🎯 ASSESSMENT:');
  console.log('==============');
  
  if (yesPercent >= 68 && yesPercent <= 75) {
    console.log('✅ SUCCESS: Distribution is optimal (68-75% YES)');
    console.log('   Prompt is properly calibrated for production use');
  } else if (yesPercent < 68) {
    console.log('⚠️  TOO HARSH: Need to be more generous');
    console.log('   Consider expanding YES criteria further');
  } else {
    console.log('⚠️  TOO LENIENT: Standards may be too low');
    console.log('   Consider tightening NO criteria');
  }
  
  // Expected behavior check
  const acclaimedYesRate = (categories.Acclaimed.YES / (categories.Acclaimed.YES + categories.Acclaimed.NO)) * 100;
  const badYesRate = (categories.Bad.YES / (categories.Bad.YES + categories.Bad.NO)) * 100;
  
  console.log('\n🔍 QUALITY CHECK:');
  console.log('=================');
  console.log(`Acclaimed films YES rate: ${acclaimedYesRate.toFixed(0)}% (should be ~95%+)`);
  console.log(`Bad films YES rate: ${badYesRate.toFixed(0)}% (should be ~20% or less)`);
  
  if (acclaimedYesRate >= 90 && badYesRate <= 30) {
    console.log('✅ Quality discrimination is working correctly');
  } else {
    console.log('⚠️  Quality discrimination may need adjustment');
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalValidation().catch(console.error);
}