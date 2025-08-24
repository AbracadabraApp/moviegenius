#!/usr/bin/env node

/**
 * Test Why Watch Batch Generation System
 * 
 * Tests the batch system on 5 sample movies before running full batch
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Get 5 sample movies for testing
 */
async function getSampleMovies() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        ma.id as analysis_id,
        ma.movie_id,
        ma.claude_response,
        m.title,
        m.year,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        AND ma.claude_response->>'raw_content' IS NOT NULL
      LIMIT 5
    `);
    
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Test Why Watch generation on sample movies
 */
async function testWhyWatchGeneration(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;
  
  try {
    console.log(`\n🎬 Testing: ${movieTitle}`);
    
    // Extract existing analysis for context
    const existingAnalysis = JSON.parse(movie.claude_response.raw_content);
    const movieData = {
      title: movie.title,
      year: movie.year,
      tmdb_id: movie.tmdb_id,
      genre: existingAnalysis.keyElements?.genre || 'Unknown',
      director: existingAnalysis.keyElements?.director || 'Unknown'
    };
    
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
      console.error(`❌ JSON Parse Error: ${parseError.message}`);
      console.error(`Raw response: ${rawResponse.substring(0, 300)}...`);
      return null;
    }

    // Validate response format
    const validation = validateWhyWatchResponse(response);
    const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
    
    // Display results
    console.log(`✅ ${response.whyWatch.recommendation}: ${response.whyWatch.reasons.join(' | ')}`);
    console.log(`   Word counts: [${validation.wordCounts.join(', ')}] avg: ${(validation.wordCounts.reduce((a,b) => a+b, 0) / 3).toFixed(1)}`);
    console.log(`   Cost: $${cost.toFixed(4)} | Time: ${processingTime}ms`);
    
    if (!validation.valid) {
      console.log(`⚠️  Validation issues: ${validation.errors.join(', ')}`);
    }
    
    if (validation.bannedWords.length > 0) {
      console.log(`⚠️  Overused words: ${validation.bannedWords.join(', ')}`);
    }
    
    return {
      success: true,
      movie: movieTitle,
      whyWatch: response.whyWatch,
      validation,
      cost
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing Why Watch Batch Generation System');
  console.log('=============================================');
  
  try {
    // Get sample movies
    const movies = await getSampleMovies();
    console.log(`📊 Testing on ${movies.length} sample movies\n`);
    
    let totalCost = 0;
    let successCount = 0;
    const results = [];
    
    // Test each movie
    for (const movie of movies) {
      const result = await testWhyWatchGeneration(movie);
      if (result) {
        results.push(result);
        totalCost += result.cost;
        successCount++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Successful: ${successCount}/${movies.length}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Average Cost: $${(totalCost / successCount).toFixed(4)} per movie`);
    
    // Distribution analysis
    const recommendations = results.reduce((acc, r) => {
      const rec = r.whyWatch.recommendation;
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nRecommendation Distribution:');
    Object.entries(recommendations).forEach(([rec, count]) => {
      const percentage = ((count / successCount) * 100).toFixed(1);
      console.log(`  ${rec}: ${count} movies (${percentage}%)`);
    });
    
    // Validation analysis
    const validResults = results.filter(r => r.validation.valid);
    console.log(`\nValid Responses: ${validResults.length}/${successCount}`);
    
    if (successCount === movies.length && validResults.length === successCount) {
      console.log('\n🎉 All tests passed! Ready to run full batch generation.');
      console.log(`💰 Estimated cost for 21,275 movies: $${(21275 * (totalCost / successCount)).toFixed(2)}`);
    } else {
      console.log('\n⚠️  Some tests failed. Review results before running full batch.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}