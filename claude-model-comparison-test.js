#!/usr/bin/env node

/**
 * Claude Model Comparison Test Script
 *
 * Compares Claude 3.5 Haiku vs Claude 3 Haiku for movie analysis generation
 * Tests with The Matrix (1999) to evaluate cost vs quality tradeoffs
 *
 * Usage:
 * node claude-model-comparison-test.js
 */

import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// Import the current prompt system
import { buildPrompt } from './lib/prompts/builder.js';

// Test configuration
const TEST_MOVIE = "The Matrix (1999)";
const MODELS = {
  'CURRENT': 'claude-3-5-haiku-20241022',    // Current model - $0.25/$1.25 per M tokens
  'ORIGINAL': 'claude-3-haiku-20240307'      // Original Haiku - $0.25/$1.25 per M tokens (same pricing!)
};

// Cost per 1M tokens (input/output)
const MODEL_COSTS = {
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
};

async function runAnalysisWithModel(modelId, movieTitle) {
  console.log(`\n🤖 Running analysis with ${modelId}...`);

  const startTime = Date.now();

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Get the prompt configuration (but override the model)
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Focus on technical and cultural analysis');

    // Override with our test model
    promptConfig.model = modelId;

    console.log(`📝 Prompt tokens estimate: ~${Math.ceil(promptConfig.system[0].text.length / 4)} tokens`);

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: movieTitle,
        },
      ],
    });

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    const response = message.content[0].text;
    const usage = message.usage;

    // Calculate cost
    const costs = MODEL_COSTS[modelId];
    const cost = (usage.input_tokens * costs.input + usage.output_tokens * costs.output) / 1000000;

    // Parse JSON to validate structure
    let parsedResponse = null;
    let isValidJson = false;

    try {
      parsedResponse = JSON.parse(response);
      isValidJson = true;
    } catch (e) {
      console.log(`⚠️  JSON parsing failed for ${modelId}: ${e.message}`);
    }

    // Quality metrics
    const wordCount = response.split(/\s+/).length;
    const characterCount = response.length;
    const contentSections = parsedResponse?.content?.length || 0;
    const featuredMovies = parsedResponse?.featuredMovies?.length || 0;
    const linkedReferences = parsedResponse?.linkedReferences?.length || 0;

    const result = {
      model: modelId,
      movieTitle,
      processingTime,
      cost,
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
      },
      quality: {
        wordCount,
        characterCount,
        isValidJson,
        contentSections,
        featuredMovies,
        linkedReferences,
        hasMetadata: !!parsedResponse?.metadata,
        hasKeyElements: !!parsedResponse?.keyElements,
        targetWordCount: parsedResponse?.metadata?.wordCount || 0
      },
      response,
      parsedResponse
    };

    console.log(`✅ ${modelId} completed:`);
    console.log(`   ⏱️  Time: ${processingTime.toFixed(2)}s`);
    console.log(`   💰 Cost: $${cost.toFixed(4)}`);
    console.log(`   📊 Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out`);
    console.log(`   📝 Words: ${wordCount}, Valid JSON: ${isValidJson}`);
    console.log(`   🎬 Content sections: ${contentSections}, Featured movies: ${featuredMovies}`);

    return result;

  } catch (error) {
    console.error(`❌ Error with ${modelId}:`, error.message);
    return {
      model: modelId,
      movieTitle,
      error: error.message,
      processingTime: (Date.now() - startTime) / 1000
    };
  }
}

function analyzeResults(results) {
  console.log(`\n📊 COMPARISON ANALYSIS\n${'='.repeat(50)}`);

  const currentResult = results.find(r => r.model === MODELS.CURRENT);
  const originalResult = results.find(r => r.model === MODELS.ORIGINAL);

  if (!currentResult || !originalResult) {
    console.log('❌ Missing results for comparison');
    return;
  }

  // Cost comparison
  const costDifference = currentResult.cost - originalResult.cost;
  const costPercentDiff = ((costDifference / originalResult.cost) * 100).toFixed(1);

  console.log('💰 COST ANALYSIS:');
  console.log(`   Current (3.5 Haiku): $${currentResult.cost.toFixed(4)}`);
  console.log(`   Original (3 Haiku): $${originalResult.cost.toFixed(4)}`);
  console.log(`   Difference: $${costDifference.toFixed(4)} (${costPercentDiff}%)`);

  // Extrapolate to full batch
  const batchSize = 20336;
  const currentBatchCost = currentResult.cost * batchSize;
  const originalBatchCost = originalResult.cost * batchSize;
  const batchSavings = currentBatchCost - originalBatchCost;

  console.log(`\n📦 BATCH COST PROJECTION (${batchSize} movies):`);
  console.log(`   Current model: $${currentBatchCost.toFixed(2)}`);
  console.log(`   Original model: $${originalBatchCost.toFixed(2)}`);
  console.log(`   Potential savings: $${Math.abs(batchSavings).toFixed(2)} (${batchSavings > 0 ? 'COST INCREASE' : 'SAVINGS'})`);

  // Performance comparison
  const timeDiff = currentResult.processingTime - originalResult.processingTime;
  const timePercentDiff = ((timeDiff / originalResult.processingTime) * 100).toFixed(1);

  console.log(`\n⏱️  PERFORMANCE ANALYSIS:`);
  console.log(`   Current: ${currentResult.processingTime.toFixed(2)}s`);
  console.log(`   Original: ${originalResult.processingTime.toFixed(2)}s`);
  console.log(`   Difference: ${timeDiff.toFixed(2)}s (${timePercentDiff}%)`);

  // Quality comparison
  console.log(`\n📝 QUALITY ANALYSIS:`);
  console.log(`   Word Count - Current: ${currentResult.quality.wordCount}, Original: ${originalResult.quality.wordCount}`);
  console.log(`   JSON Valid - Current: ${currentResult.quality.isValidJson}, Original: ${originalResult.quality.isValidJson}`);
  console.log(`   Content Sections - Current: ${currentResult.quality.contentSections}, Original: ${originalResult.quality.contentSections}`);
  console.log(`   Featured Movies - Current: ${currentResult.quality.featuredMovies}, Original: ${originalResult.quality.featuredMovies}`);

  // Token usage comparison
  console.log(`\n🔢 TOKEN USAGE:`);
  console.log(`   Current - Input: ${currentResult.usage.inputTokens}, Output: ${currentResult.usage.outputTokens}`);
  console.log(`   Original - Input: ${originalResult.usage.inputTokens}, Output: ${originalResult.usage.outputTokens}`);

  // Recommendation
  console.log(`\n🎯 RECOMMENDATION:`);

  if (Math.abs(costDifference) < 0.0005) {
    console.log('   💡 COST: Essentially identical pricing - no significant difference');
  } else if (costDifference < 0) {
    console.log(`   💰 COST: Original model saves $${Math.abs(batchSavings).toFixed(2)} for full batch`);
  } else {
    console.log(`   💸 COST: Current model costs $${batchSavings.toFixed(2)} more for full batch`);
  }

  const qualityScore = (result) => {
    let score = 0;
    if (result.quality.isValidJson) score += 3;
    if (result.quality.contentSections >= 4) score += 2;
    if (result.quality.featuredMovies >= 4) score += 1;
    if (result.quality.wordCount >= 300 && result.quality.wordCount <= 500) score += 2;
    return score;
  };

  const currentQuality = qualityScore(currentResult);
  const originalQuality = qualityScore(originalResult);

  if (currentQuality > originalQuality) {
    console.log(`   📊 QUALITY: Current model shows better structure and completeness`);
  } else if (originalQuality > currentQuality) {
    console.log(`   📊 QUALITY: Original model shows better structure and completeness`);
  } else {
    console.log(`   📊 QUALITY: Both models show similar quality levels`);
  }

  if (Math.abs(batchSavings) > 50 && originalQuality >= currentQuality) {
    console.log(`\n🏆 FINAL RECOMMENDATION: Switch to Original Haiku for $${Math.abs(batchSavings).toFixed(2)} savings`);
  } else if (currentQuality > originalQuality && Math.abs(batchSavings) < 100) {
    console.log(`\n🏆 FINAL RECOMMENDATION: Keep Current model for better quality`);
  } else {
    console.log(`\n🏆 FINAL RECOMMENDATION: Quality and cost are similar - either model works`);
  }
}

async function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `claude-comparison-${timestamp}.json`;

  await fs.writeFile(filename, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${filename}`);
}

async function main() {
  console.log(`🎬 Claude Model Comparison Test`);
  console.log(`Movie: ${TEST_MOVIE}`);
  console.log(`Models: ${Object.values(MODELS).join(' vs ')}`);

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const results = [];

  // Run tests with both models
  for (const [label, modelId] of Object.entries(MODELS)) {
    const result = await runAnalysisWithModel(modelId, TEST_MOVIE);
    results.push(result);

    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Analyze and compare results
  analyzeResults(results);

  // Save detailed results
  await saveResults(results);

  console.log(`\n✅ Comparison complete!`);
}

// Handle errors gracefully
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});