#!/usr/bin/env node

/**
 * 3-Movie Mini JSON Test Controller
 * Tests movies 1, 5 (individual API) and 43 (Batch API) with cost collection
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test TMDB IDs from PROMPT_C3_Test_LIST.txt (lines 1, 5, 43)
const TEST_TMDB_IDS = [963, 599, 10020];

class MiniTestController {
  constructor() {
    this.stats = {
      individualApiCosts: [],
      batchApiCost: 0,
      totalCost: 0,
      processingTimes: [],
      startTime: Date.now()
    };
    this.results = [];
  }

  async loadTestMovies() {
    console.log('🎬 Loading 3 test movies...');
    
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .in('tmdb_id', TEST_TMDB_IDS);

    if (error) {
      throw new Error(`Error fetching movies: ${error.message}`);
    }

    if (!movies || movies.length !== 3) {
      throw new Error(`Expected 3 movies, found ${movies?.length || 0}`);
    }

    // Sort by our test order (1, 5, 43)
    const sortedMovies = TEST_TMDB_IDS.map(tmdbId => 
      movies.find(m => m.tmdb_id === tmdbId)
    ).filter(Boolean);

    console.log('📋 Test movies:');
    sortedMovies.forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
    });

    return sortedMovies;
  }

  async processIndividualMovie(movie, movieNumber) {
    console.log(`\n🔧 Processing Movie ${movieNumber}: ${movie.title} (${movie.year}) via Individual API`);
    const startTime = Date.now();

    try {
      // Delete existing analysis
      await supabase
        .from('movie_analyses')
        .delete()
        .eq('movie_id', movie.id);

      // Use new JSON prompt
      const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Generate comprehensive JSON analysis for testing');

      const response = await anthropic.messages.create({
        ...promptConfig,
        messages: [{
          role: 'user',
          content: `${movie.title} (${movie.year})`,
        }],
      });

      const analysis = response.content[0].text;
      const usage = response.usage;

      // Calculate cost
      const cost = (usage.input_tokens * 3) / 1000000 + (usage.output_tokens * 15) / 1000000;
      this.stats.individualApiCosts.push(cost);

      // Store analysis
      const analysisData = {
        raw_content: analysis,
        generated_at: new Date().toISOString(),
        cost_estimate: cost,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        model: promptConfig.model,
        test_type: 'individual_api',
        entity_data: null,
      };

      await supabase.from('movie_analyses').insert({
        movie_id: movie.id,
        analysis_type: 'page_analysis',
        claude_response: analysisData,
        query_text: `JSON mini test - ${movie.title} (${movie.year})`,
      });

      const processingTime = Date.now() - startTime;
      this.stats.processingTimes.push(processingTime);

      console.log(`✅ Individual API complete - ${(processingTime / 1000).toFixed(1)}s, Cost: $${cost.toFixed(4)}`);

      // Try to parse JSON for validation
      let jsonValid = false;
      try {
        JSON.parse(analysis);
        jsonValid = true;
        console.log(`📋 JSON validation: PASSED`);
      } catch (e) {
        console.log(`⚠️ JSON validation: FAILED - ${e.message}`);
      }

      this.results.push({
        movie,
        method: 'individual_api',
        success: true,
        cost,
        processingTime,
        jsonValid,
        tokens: usage.input_tokens + usage.output_tokens
      });

    } catch (error) {
      console.error(`❌ Individual API failed: ${error.message}`);
      this.results.push({
        movie,
        method: 'individual_api',
        success: false,
        error: error.message
      });
    }
  }

  async processBatchMovie(movie) {
    console.log(`\n🚀 Processing Movie 43: ${movie.title} (${movie.year}) via Batch API`);
    const startTime = Date.now();

    try {
      // Delete existing analysis
      await supabase
        .from('movie_analyses')
        .delete()
        .eq('movie_id', movie.id);

      // Create batch request
      const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Generate comprehensive JSON analysis for batch testing');

      const batchRequest = {
        custom_id: `test_movie_43_${movie.tmdb_id}`,
        params: {
          ...promptConfig,
          messages: [{
            role: 'user',
            content: `${movie.title} (${movie.year})`,
          }],
        },
      };

      console.log('📦 Submitting batch request...');
      const batch = await anthropic.beta.messages.batches.create({
        requests: [batchRequest],
      });

      console.log(`✅ Batch submitted: ${batch.id}`);
      console.log(`📊 Status: ${batch.processing_status}`);

      // Save batch info for monitoring
      const batchInfo = {
        id: batch.id,
        movie,
        submitted_at: new Date().toISOString(),
        purpose: 'movie_43_json_test'
      };

      writeFileSync('./test-batch-movie-43.json', JSON.stringify(batchInfo, null, 2));

      // Poll for completion
      console.log('⏳ Waiting for batch completion...');
      let batchComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 10 minutes max

      while (!batchComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const updatedBatch = await anthropic.beta.messages.batches.retrieve(batch.id);
        console.log(`🔍 Check ${attempts + 1}: Status ${updatedBatch.processing_status}`);

        if (updatedBatch.processing_status === 'ended') {
          batchComplete = true;
          
          // Get results
          const results = await anthropic.beta.messages.batches.results(batch.id);
          
          if (results && results.length > 0) {
            const result = results[0];
            
            if (result.result && result.result.type === 'succeeded') {
              const message = result.result.message;
              const analysis = message.content[0].text;
              const usage = message.usage;

              // Calculate batch cost (50% savings)
              const baseCost = (usage.input_tokens * 3) / 1000000 + (usage.output_tokens * 15) / 1000000;
              const batchCost = baseCost * 0.5; // 50% batch savings
              this.stats.batchApiCost = batchCost;

              // Store analysis
              const analysisData = {
                raw_content: analysis,
                generated_at: new Date().toISOString(),
                cost_estimate: batchCost,
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
                model: promptConfig.model,
                test_type: 'batch_api',
                batch_id: batch.id,
                entity_data: null,
              };

              await supabase.from('movie_analyses').insert({
                movie_id: movie.id,
                analysis_type: 'page_analysis',
                claude_response: analysisData,
                query_text: `JSON mini test batch - ${movie.title} (${movie.year})`,
              });

              const processingTime = Date.now() - startTime;
              this.stats.processingTimes.push(processingTime);

              console.log(`✅ Batch API complete - ${(processingTime / 1000).toFixed(1)}s, Cost: $${batchCost.toFixed(4)} (50% savings)`);

              // Try to parse JSON for validation
              let jsonValid = false;
              try {
                JSON.parse(analysis);
                jsonValid = true;
                console.log(`📋 JSON validation: PASSED`);
              } catch (e) {
                console.log(`⚠️ JSON validation: FAILED - ${e.message}`);
              }

              this.results.push({
                movie,
                method: 'batch_api',
                success: true,
                cost: batchCost,
                processingTime,
                jsonValid,
                tokens: usage.input_tokens + usage.output_tokens,
                batchId: batch.id
              });

            } else {
              throw new Error(`Batch result failed: ${result.result?.error?.message || 'Unknown error'}`);
            }
          } else {
            throw new Error('No batch results returned');
          }
        }
        
        attempts++;
      }

      if (!batchComplete) {
        throw new Error('Batch processing timed out');
      }

    } catch (error) {
      console.error(`❌ Batch API failed: ${error.message}`);
      this.results.push({
        movie,
        method: 'batch_api',
        success: false,
        error: error.message
      });
    }
  }

  printSummary() {
    const totalTime = Date.now() - this.stats.startTime;
    const successfulResults = this.results.filter(r => r.success);
    
    this.stats.totalCost = 
      this.stats.individualApiCosts.reduce((sum, cost) => sum + cost, 0) + 
      this.stats.batchApiCost;

    console.log('\n✅ 3-Movie Mini Test Complete!');
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`📊 Results: ${successfulResults.length}/3 successful`);
    
    console.log('\n💰 Cost Analysis:');
    this.stats.individualApiCosts.forEach((cost, i) => {
      console.log(`  Movie ${i + 1} (Individual): $${cost.toFixed(4)}`);
    });
    console.log(`  Movie 43 (Batch): $${this.stats.batchApiCost.toFixed(4)}`);
    console.log(`  Total: $${this.stats.totalCost.toFixed(4)}`);
    
    // Calculate batch savings
    if (this.stats.batchApiCost > 0) {
      const batchResult = this.results.find(r => r.method === 'batch_api' && r.success);
      if (batchResult) {
        const individualEquivalent = (batchResult.tokens * 0.015) / 1000; // Rough estimate
        const savings = ((individualEquivalent - this.stats.batchApiCost) / individualEquivalent * 100);
        console.log(`  Batch savings: ${savings.toFixed(1)}%`);
      }
    }

    console.log('\n📋 JSON Validation:');
    this.results.forEach((result, i) => {
      if (result.success) {
        console.log(`  Movie ${i === 2 ? '43' : i + 1}: ${result.jsonValid ? '✅ Valid' : '❌ Invalid'} JSON`);
      }
    });

    // Save detailed results
    const detailedResults = {
      timestamp: new Date().toISOString(),
      totalTime,
      stats: this.stats,
      results: this.results
    };

    writeFileSync('./test-json-mini-results.json', JSON.stringify(detailedResults, null, 2));
    console.log('\n📁 Detailed results saved to test-json-mini-results.json');
  }
}

async function main() {
  const command = process.argv[2];
  
  if (command === '--help') {
    console.log(`
🧪 3-Movie Mini JSON Test Controller

Usage:
  node scripts/test-json-mini.js run     # Run full 3-movie test
  node scripts/test-json-mini.js backup  # Backup existing analyses first
  node scripts/test-json-mini.js restore # Restore from backup

Test Plan:
  Movie 1 (TMDB 963): Individual API + JSON validation
  Movie 5 (TMDB 599): Individual API + JSON validation  
  Movie 43 (TMDB 10020): Batch API + cost collection + JSON validation
    `);
    return;
  }

  if (command === 'backup') {
    console.log('🔄 Running backup first...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('node scripts/backup-test-analyses.js');
      console.log('✅ Backup complete. Now run: node scripts/test-json-mini.js run');
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
    }
    return;
  }

  if (command === 'restore') {
    console.log('🔄 Running restore...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('node scripts/restore-test-analyses.js');
      console.log('✅ Restore complete.');
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
    }
    return;
  }

  console.log('🧪 Starting 3-Movie Mini JSON Test');
  console.log('Testing Individual API (movies 1,5) + Batch API (movie 43) with cost collection\n');

  const controller = new MiniTestController();

  try {
    const movies = await controller.loadTestMovies();

    // Process movies 1 and 5 with individual API
    await controller.processIndividualMovie(movies[0], 1);
    await controller.processIndividualMovie(movies[1], 5);

    // Process movie 43 with batch API
    await controller.processBatchMovie(movies[2]);

    controller.printSummary();

  } catch (error) {
    console.error('❌ Mini test failed:', error.message);
    process.exit(1);
  }
}

main();