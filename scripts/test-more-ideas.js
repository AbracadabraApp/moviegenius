#!/usr/bin/env node

/**
 * Test More Ideas Generator
 * 
 * Tests the More Ideas generation system on sample movies
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildMoreIdeasPrompt, validateMoreIdeasResponse } from '../lib/prompts/more-ideas-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate More Ideas for a single movie
 */
async function generateMoreIdeas(movieTitle) {
  console.log(`\n🎬 Generating More Ideas for: ${movieTitle}`);
  
  try {
    const prompt = buildMoreIdeasPrompt(movieTitle);
    
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
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
        {
          role: 'assistant',
          content: '{\n  "moreIdeas": [\n    {'
        }
      ],
    });

    const processingTime = Date.now() - startTime;
    const prefill = '{\n  "moreIdeas": [\n    {';
    const rawResponse = prefill + message.content[0].text;
    
    // Parse and validate JSON response
    let response;
    try {
      response = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(`❌ JSON Parse Error: ${parseError.message}`);
      console.error(`Raw response: ${rawResponse.substring(0, 500)}...`);
      return null;
    }

    // Validate response format
    const validation = validateMoreIdeasResponse(response);
    const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
    
    // Display results summary
    console.log(`✅ Generated ${response.moreIdeas.length} recommendations`);
    console.log(`   Connection lengths: avg ${validation.avgConnectionLength.toFixed(1)} words`);
    console.log(`   Cost: $${cost.toFixed(4)} | Time: ${processingTime}ms`);
    
    if (!validation.valid) {
      console.log(`⚠️  Validation issues: ${validation.errors.join(', ')}`);
    }
    
    // Show sample recommendations by tier
    const ideas = response.moreIdeas;
    console.log('\n📋 SAMPLE RECOMMENDATIONS:');
    console.log('TIER 1 (Closest):');
    ideas.slice(0, 3).forEach((idea, i) => {
      console.log(`  ${i+1}. ${idea.title} (${idea.year}) - ${idea.connection}`);
    });
    
    console.log('TIER 2 (Thematic):');
    ideas.slice(8, 11).forEach((idea, i) => {
      console.log(`  ${i+9}. ${idea.title} (${idea.year}) - ${idea.connection}`);
    });
    
    console.log('TIER 3 (Loose):');
    ideas.slice(20, 23).forEach((idea, i) => {
      console.log(`  ${i+21}. ${idea.title} (${idea.year}) - ${idea.connection}`);
    });
    
    return {
      success: true,
      movie: movieTitle,
      moreIdeas: response.moreIdeas,
      validation,
      metadata: {
        processingTime,
        tokens: message.usage.input_tokens + message.usage.output_tokens,
        cost
      }
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
  console.log('🧪 Testing More Ideas Generation System');
  console.log('=======================================');
  
  const testMovies = [
    "Fight Club (1999)",
    "Citizen Kane (1941)",
    "Blade Runner (1982)"
  ];
  
  try {
    let totalCost = 0;
    let successCount = 0;
    const results = [];
    
    // Test each movie
    for (const movieTitle of testMovies) {
      const result = await generateMoreIdeas(movieTitle);
      if (result) {
        results.push(result);
        totalCost += result.metadata.cost;
        successCount++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Successful: ${successCount}/${testMovies.length}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Average Cost: $${(totalCost / successCount).toFixed(4)} per movie`);
    
    // Validation analysis
    const validResults = results.filter(r => r.validation.valid);
    console.log(`Valid Responses: ${validResults.length}/${successCount}`);
    
    // Connection quality analysis
    const avgRecommendations = results.reduce((sum, r) => sum + r.moreIdeas.length, 0) / results.length;
    console.log(`Average Recommendations: ${avgRecommendations.toFixed(1)}`);
    
    if (validResults.length === successCount) {
      console.log('\n🎉 All tests passed! More Ideas generator ready for production.');
    } else {
      console.log('\n⚠️  Some validation issues. Review before production use.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateMoreIdeas };