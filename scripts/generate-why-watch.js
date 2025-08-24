#!/usr/bin/env node

/**
 * Generate Why Watch recommendations using the new focused prompt
 * Usage: node scripts/generate-why-watch.js "Movie Title (Year)"
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate Why Watch recommendation for a single movie
 */
async function generateWhyWatch(movieTitle, movieData = {}) {
  console.log(`🎬 Generating Why Watch for: ${movieTitle}`);
  
  try {
    const prompt = buildWhyWatchPrompt(movieTitle, movieData);
    
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
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
    const rawResponse = message.content[0].text;
    
    // Parse and validate JSON response
    let response;
    try {
      response = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Raw response:', rawResponse.substring(0, 500));
      return null;
    }

    // Validate response format
    const validation = validateWhyWatchResponse(response);
    
    const result = {
      movie: movieTitle,
      whyWatch: response.whyWatch,
      metadata: {
        ...response.metadata,
        processingTime,
        tokens: message.usage.input_tokens + message.usage.output_tokens,
        cost: (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000
      },
      validation
    };

    // Display results
    console.log(`✅ ${response.whyWatch.recommendation}: ${response.whyWatch.reasons.join(' | ')}`);
    console.log(`   Word counts: [${validation.wordCounts.join(', ')}] avg: ${(validation.wordCounts.reduce((a,b) => a+b, 0) / 3).toFixed(1)}`);
    
    if (!validation.valid) {
      console.log(`⚠️  Validation issues: ${validation.errors.join(', ')}`);
    }
    
    if (validation.bannedWords.length > 0) {
      console.log(`⚠️  Overused words: ${validation.bannedWords.join(', ')}`);
    }
    
    console.log(`💰 Cost: $${result.metadata.cost.toFixed(4)} | Time: ${processingTime}ms`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error generating Why Watch:`, error.message);
    return null;
  }
}

/**
 * Test with multiple movies
 */
async function testMultipleMovies() {
  const testMovies = [
    { title: "The Godfather (1972)", data: { director: "Francis Ford Coppola", genre: "Crime Drama" }},
    { title: "Parasite (2019)", data: { director: "Bong Joon-ho", genre: "Thriller" }},
    { title: "The Emoji Movie (2017)", data: { director: "Tony Leondis", genre: "Animation" }},
    { title: "Citizen Kane (1941)", data: { director: "Orson Welles", genre: "Drama" }},
    { title: "Transformers: Age of Extinction (2014)", data: { director: "Michael Bay", genre: "Action" }}
  ];
  
  console.log('🚀 Testing Why Watch Generator');
  console.log('===============================\n');
  
  const results = [];
  let totalCost = 0;
  
  for (const movie of testMovies) {
    const result = await generateWhyWatch(movie.title, movie.data);
    if (result) {
      results.push(result);
      totalCost += result.metadata.cost;
    }
    
    // Pause between requests
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('==========');
  
  const recommendations = results.reduce((acc, r) => {
    const rec = r.whyWatch.recommendation;
    acc[rec] = (acc[rec] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Recommendations:');
  Object.entries(recommendations).forEach(([rec, count]) => {
    console.log(`  ${rec}: ${count} movies`);
  });
  
  console.log(`\nTotal Cost: $${totalCost.toFixed(4)}`);
  
  const validResults = results.filter(r => r.validation.valid);
  console.log(`Valid Responses: ${validResults.length}/${results.length}`);
  
  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No arguments - run test suite
    await testMultipleMovies();
  } else {
    // Single movie provided
    const movieTitle = args.join(' ');
    await generateWhyWatch(movieTitle);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateWhyWatch, testMultipleMovies };