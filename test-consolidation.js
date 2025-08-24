#!/usr/bin/env node

import fs from 'fs';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testConsolidation() {
  console.log('Testing consolidation with 5 movies...');
  
  // Load data
  const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));
  const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
  
  // Get 5 movies and 10 small lists
  const movies = testData.movieData.slice(0, 5);
  const smallLists = progressData.masterLists.filter(list => list.movieIds.length <= 9).slice(0, 10);
  
  console.log(`Testing with ${movies.length} movies and ${smallLists.length} small lists`);
  
  // Build a simple prompt
  const movie = movies[0];
  const movieText = `"${movie.title}" (${movie.year})`;
  
  const listsText = smallLists.map(list => {
    return `"${list.name}" (${list.movieIds.length} movies)`;
  }).join('\n');
  
  const prompt = `You are a film curator analyzing whether musical films belong in existing thematic lists.

Movie: ${movieText}

Small Lists:
${listsText}

Assign this movie to lists where it has a strong thematic fit (>65% match required).

Output JSON:
{
  "assignments": [
    {"listName": "List Name", "movieId": "${movie.id}", "reason": "Why it fits"}
  ]
}`;

  console.log('Testing API call...');
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    console.log('✅ API call successful!');
    console.log('Response:', response.content[0].text);
    console.log('Cost:', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost: (response.usage.input_tokens / 1000000) * 3 + (response.usage.output_tokens / 1000000) * 15
    });
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testConsolidation().catch(console.error);