#!/usr/bin/env node

/**
 * Test YES/NO distribution across diverse movie sample
 * Efficient distribution analysis without full 1000 movie cost
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Diverse sample across quality levels, genres, and eras
const SAMPLE_MOVIES = [
  // Universally acclaimed classics (should be YES)
  { title: "The Godfather (1972)", quality: "masterpiece" },
  { title: "Citizen Kane (1941)", quality: "masterpiece" },
  { title: "Casablanca (1942)", quality: "masterpiece" },
  { title: "Vertigo (1958)", quality: "masterpiece" },
  { title: "Tokyo Story (1953)", quality: "masterpiece" },
  
  // Modern acclaimed films (likely YES)
  { title: "Parasite (2019)", quality: "acclaimed" },
  { title: "Moonlight (2016)", quality: "acclaimed" },
  { title: "Mad Max: Fury Road (2015)", quality: "acclaimed" },
  { title: "There Will Be Blood (2007)", quality: "acclaimed" },
  { title: "No Country for Old Men (2007)", quality: "acclaimed" },
  
  // Popular but divisive (mixed)
  { title: "Avatar (2009)", quality: "popular" },
  { title: "Titanic (1997)", quality: "popular" },
  { title: "The Dark Knight (2008)", quality: "popular" },
  { title: "Avengers: Endgame (2019)", quality: "popular" },
  { title: "Top Gun: Maverick (2022)", quality: "popular" },
  
  // Cult/genre favorites (likely YES)
  { title: "Blade Runner (1982)", quality: "cult" },
  { title: "The Big Lebowski (1998)", quality: "cult" },
  { title: "Fight Club (1999)", quality: "cult" },
  { title: "Pulp Fiction (1994)", quality: "cult" },
  { title: "Goodfellas (1990)", quality: "cult" },
  
  // Notorious bad films (should be NO)
  { title: "The Room (2003)", quality: "bad" },
  { title: "Plan 9 from Outer Space (1959)", quality: "bad" },
  { title: "Battlefield Earth (2000)", quality: "bad" },
  { title: "The Emoji Movie (2017)", quality: "bad" },
  { title: "Cats (2019)", quality: "bad" },
  
  // Mediocre/forgettable (likely NO)
  { title: "Transformers: Age of Extinction (2014)", quality: "mediocre" },
  { title: "Batman & Robin (1997)", quality: "mediocre" },
  { title: "Green Lantern (2011)", quality: "mediocre" },
  { title: "The Mummy (2017)", quality: "mediocre" },
  { title: "Justice League (2017)", quality: "mediocre" }
];

async function testDistribution() {
  console.log('🎯 YES/NO Distribution Analysis');
  console.log('================================\n');
  console.log(`Testing ${SAMPLE_MOVIES.length} movies across quality levels...\n`);
  
  const results = {
    YES: [],
    NO: [],
    errors: []
  };
  
  const qualityBreakdown = {};
  let totalCost = 0;
  
  for (let i = 0; i < SAMPLE_MOVIES.length; i++) {
    const movie = SAMPLE_MOVIES[i];
    process.stdout.write(`\r[${i + 1}/${SAMPLE_MOVIES.length}] ${movie.title}...`);
    
    try {
      const prompt = buildWhyWatchPrompt(movie.title, {});
      const startTime = Date.now();
      
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
                cache_control: { type: 'ephemeral' }
              }
            ]
          },
        ],
      });

      const processingTime = Date.now() - startTime;
      const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
      totalCost += cost;
      
      const response = JSON.parse(message.content[0].text);
      const recommendation = response.whyWatch.recommendation;
      
      results[recommendation].push({
        title: movie.title,
        quality: movie.quality,
        recommendation,
        processingTime,
        cost
      });
      
      // Track by quality level
      if (!qualityBreakdown[movie.quality]) {
        qualityBreakdown[movie.quality] = { YES: 0, NO: 0 };
      }
      qualityBreakdown[movie.quality][recommendation]++;
      
    } catch (error) {
      results.errors.push({ title: movie.title, error: error.message });
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n\n📊 DISTRIBUTION RESULTS');
  console.log('=======================\n');
  
  const totalMovies = results.YES.length + results.NO.length;
  const yesPercent = ((results.YES.length / totalMovies) * 100).toFixed(1);
  const noPercent = ((results.NO.length / totalMovies) * 100).toFixed(1);
  
  console.log(`✅ YES: ${results.YES.length} movies (${yesPercent}%)`);
  console.log(`❌ NO:  ${results.NO.length} movies (${noPercent}%)`);
  console.log(`❗ Errors: ${results.errors.length} movies\n`);
  
  console.log('📈 BY QUALITY LEVEL:');
  console.log('===================');
  Object.entries(qualityBreakdown).forEach(([quality, counts]) => {
    const total = counts.YES + counts.NO;
    const yesRate = ((counts.YES / total) * 100).toFixed(0);
    console.log(`${quality.padEnd(12)}: ${counts.YES}Y/${counts.NO}N (${yesRate}% YES)`);
  });
  
  console.log(`\n💰 Total Cost: $${totalCost.toFixed(3)}`);
  console.log(`⏱️  Average Time: ${(results.YES.concat(results.NO).reduce((sum, r) => sum + r.processingTime, 0) / totalMovies).toFixed(0)}ms`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => {
      console.log(`   ${error.title}: ${error.error}`);
    });
  }
  
  return {
    distribution: { YES: results.YES.length, NO: results.NO.length },
    qualityBreakdown,
    totalCost,
    totalMovies
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDistribution().catch(console.error);
}