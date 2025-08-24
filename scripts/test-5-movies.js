#!/usr/bin/env node

/**
 * Test 5 diverse movies with the updated Why Watch prompt
 * Focus on clean bullet formatting and variety
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TEST_MOVIES = [
  { title: "Pulp Fiction (1994)", data: { director: "Quentin Tarantino", genre: "Crime" }},
  { title: "The Room (2003)", data: { director: "Tommy Wiseau", genre: "Drama" }},
  { title: "Mad Max: Fury Road (2015)", data: { director: "George Miller", genre: "Action" }},
  { title: "Cats (2019)", data: { director: "Tom Hooper", genre: "Musical" }},
  { title: "Moonlight (2016)", data: { director: "Barry Jenkins", genre: "Drama" }}
];

async function testMovie(movie) {
  console.log(`🎬 ${movie.title}`);
  
  try {
    const prompt = buildWhyWatchPrompt(movie.title, movie.data);
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

    const response = JSON.parse(message.content[0].text);
    const validation = validateWhyWatchResponse(response);
    
    // Clean bullet formatting
    console.log(`${response.whyWatch.recommendation === 'YES' ? '✅' : '❌'} ${response.whyWatch.recommendation}`);
    response.whyWatch.reasons.forEach((reason, index) => {
      console.log(`   • ${reason}`);
    });
    
    if (!validation.valid) {
      console.log(`   ⚠️  Issues: ${validation.errors.join(', ')}`);
    }
    
    console.log('');
    return response;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return null;
  }
}

async function main() {
  console.log('🎯 Testing 5 Movies - Clean Bullet Format');
  console.log('=========================================\n');
  
  const results = [];
  
  for (const movie of TEST_MOVIES) {
    const result = await testMovie(movie);
    if (result) {
      results.push(result);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const yesCount = results.filter(r => r?.whyWatch.recommendation === 'YES').length;
  const noCount = results.filter(r => r?.whyWatch.recommendation === 'NO').length;
  
  console.log('📊 Summary:');
  console.log(`   YES: ${yesCount} movies`);
  console.log(`   NO: ${noCount} movies`);
  console.log(`   Total: ${results.length} movies tested`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}