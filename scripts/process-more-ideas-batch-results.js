#!/usr/bin/env node

/**
 * Process completed batch results and save to database
 * Usage: node process-batch-results.js <batch_id>
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { validateMoreIdeasResponse } from '../lib/prompts/more-ideas-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function processBatchResults(batchId) {
  console.log(`📥 Processing batch results for: ${batchId}`);
  
  try {
    // Get batch info
    const batch = await anthropic.beta.messages.batches.retrieve(batchId);
    console.log(`📊 Batch status: ${batch.processing_status}`);
    console.log(`📊 Results: ${batch.request_counts.succeeded} succeeded, ${batch.request_counts.errored} failed`);
    
    if (batch.processing_status !== 'ended') {
      throw new Error(`Batch not completed. Status: ${batch.processing_status}`);
    }
    
    // Download results
    const resultsStream = await anthropic.beta.messages.batches.results(batchId);
    
    const results = [];
    const successful = [];
    const failed = [];
    
    // Process each result with error safety and memory efficiency
    let processedCount = 0;
    
    try {
      for await (const result of resultsStream) {
        try {
          // Process individual result immediately
          if (result.result.type === 'succeeded') {
            try {
              // Parse JSON directly (no prefill)
              const parsedResponse = JSON.parse(result.result.message.content[0].text);
              
              // Validate response
              const validation = validateMoreIdeasResponse(parsedResponse);
              if (!validation.valid) {
                console.warn(`⚠️  Validation failed for ${result.custom_id}:`, validation.errors);
              }
              
              // Extract TMDB ID from custom_id
              const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
              
              // Save to database with conflict resolution
              await pool.query(`
                INSERT INTO more_ideas (tmdb_id, ideas, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (tmdb_id) DO UPDATE SET 
                  ideas = EXCLUDED.ideas,
                  metadata = EXCLUDED.metadata,
                  updated_at = NOW()
              `, [
                tmdbId,
                JSON.stringify(parsedResponse.moreIdeas),
                JSON.stringify({ batch_id: batchId, processed_at: new Date().toISOString() })
              ]);
              
              successful.push({
                tmdbId,
                recommendations: parsedResponse.moreIdeas.length,
                success: true
              });
              
            } catch (parseError) {
              console.error(`❌ Parse error for ${result.custom_id}:`, parseError.message);
              failed.push({
                customId: result.custom_id,
                error: parseError.message,
                success: false
              });
            }
          } else {
            failed.push({
              customId: result.custom_id,
              error: result.result.error?.message || 'Unknown error',
              success: false
            });
          }
          
          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`📊 Processed ${processedCount} results...`);
          }
          
        } catch (resultError) {
          console.error(`❌ Error processing result ${result.custom_id}:`, resultError.message);
          failed.push({
            customId: result.custom_id,
            error: resultError.message,
            success: false
          });
        }
      }
    } catch (streamError) {
      console.error('❌ Error reading results stream:', streamError.message);
      throw streamError;
    }
    
    // Calculate actual cost (properly)
    const usage = batch.usage || { input_tokens: 0, output_tokens: 0 };
    const inputCost = usage.input_tokens * 3 / 1000000;
    const outputCost = usage.output_tokens * 15 / 1000000;
    
    // Apply savings correctly (caching on input, batch on total)
    const CACHE_SAVINGS = 0.9; // 90% savings on cached input tokens
    const BATCH_SAVINGS = 0.5; // 50% savings from batch API
    
    const cachedInputCost = inputCost * (1 - CACHE_SAVINGS);
    const totalBeforeBatch = cachedInputCost + outputCost;
    const actualCost = totalBeforeBatch * (1 - BATCH_SAVINGS);
    
    const baseCost = inputCost + outputCost;
    
    console.log(`\n✅ BATCH PROCESSING COMPLETE`);
    console.log(`📊 Saved: ${successful.length} movies`);
    console.log(`❌ Failed: ${failed.length} movies`);
    console.log(`💰 Cost: $${actualCost.toFixed(4)}`);
    
    // Show successful saves
    if (successful.length > 0) {
      console.log(`\n📝 Successfully saved More Ideas for:`);
      successful.forEach(s => {
        console.log(`  TMDB ${s.tmdbId}: ${s.recommendations} recommendations`);
      });
    }
    
    return { successful: successful.length, failed: failed.length, cost: actualCost };
    
  } catch (error) {
    console.error('❌ Error processing batch results:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const batchId = process.argv[2];
  if (!batchId) {
    console.error('Usage: node process-batch-results.js <batch_id>');
    process.exit(1);
  }
  
  processBatchResults(batchId).catch(console.error);
}