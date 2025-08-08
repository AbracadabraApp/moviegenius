/**
 * Railway Batch Processing API - Status
 *
 * Endpoint to check and retrieve completed Claude batches
 * Processes completed batches and saves results to database
 */

import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';

const pool = getPool();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class RailwayBatchStatusProcessor {
  constructor() {
    this.maxBatchesToProcess = 5; // Process up to 5 completed batches per run
  }

  async getActiveBatches() {
    try {
      const { data: batches, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .in('status', ['in_progress', 'validating', 'finalizing'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return batches || [];
    } catch (error) {
      console.error('Error getting active batches:', error);
      return [];
    }
  }

  async checkBatchStatus(batch) {
    try {
      const claudeBatch = await anthropic.beta.messages.batches.retrieve(batch.batch_id);

      // Update batch status in database
      await supabase
        .from('batch_jobs')
        .update({
          status: claudeBatch.processing_status,
          updated_at: new Date().toISOString(),
        })
        .eq('batch_id', batch.batch_id);

      return claudeBatch;
    } catch (error) {
      console.error(`Error checking batch ${batch.batch_id}:`, error);
      return null;
    }
  }

  async processCompletedBatch(batch) {
    try {
      console.log(`Processing completed batch: ${batch.batch_id}`);

      // Get batch results from Claude
      const results = await anthropic.beta.messages.batches.results(batch.batch_id);

      let saved = 0;
      let failed = 0;

      for await (const result of results) {
        try {
          if (result.result.type === 'succeeded') {
            const movieId = result.custom_id;
            const analysis = result.result.message.content[0].text;

            // Save movie analysis to database
            await supabase.from('movie_analyses').insert({
              movie_id: movieId,
              analysis_type: 'comprehensive',
              claude_response: {
                content: analysis,
                model: 'claude-3-5-sonnet-20241022',
                batch_id: batch.batch_id,
                timestamp: new Date().toISOString(),
              },
              created_at: new Date().toISOString(),
            });

            saved++;
          } else {
            failed++;
            console.warn(`Batch result failed for ${result.custom_id}:`, result.result.error);
          }
        } catch (saveError) {
          failed++;
          console.error(`Error saving result for ${result.custom_id}:`, saveError);
        }
      }

      // Mark batch as completed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'completed',
          results_saved: saved,
          results_failed: failed,
          completed_at: new Date().toISOString(),
        })
        .eq('batch_id', batch.batch_id);

      return { saved, failed };
    } catch (error) {
      console.error(`Error processing completed batch ${batch.batch_id}:`, error);

      // Mark batch as failed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('batch_id', batch.batch_id);

      throw error;
    }
  }

  async processBatch() {
    try {
      const activeBatches = await this.getActiveBatches();

      if (activeBatches.length === 0) {
        return {
          success: true,
          message: 'No active batches to check',
          batches_checked: 0,
        };
      }

      let batchesChecked = 0;
      let batchesCompleted = 0;
      let totalSaved = 0;
      let totalFailed = 0;
      const results = [];

      for (const batch of activeBatches) {
        try {
          const claudeBatch = await this.checkBatchStatus(batch);
          batchesChecked++;

          if (claudeBatch && claudeBatch.processing_status === 'ended') {
            const { saved, failed } = await this.processCompletedBatch(batch);
            batchesCompleted++;
            totalSaved += saved;
            totalFailed += failed;

            results.push({
              batch_id: batch.batch_id,
              type: batch.type,
              status: 'completed',
              saved: saved,
              failed: failed,
            });
          } else {
            results.push({
              batch_id: batch.batch_id,
              type: batch.type,
              status: claudeBatch?.processing_status || 'unknown',
            });
          }

          // Small delay between batch checks
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing batch ${batch.batch_id}:`, error);
          results.push({
            batch_id: batch.batch_id,
            type: batch.type,
            status: 'error',
            error: error.message,
          });
        }
      }

      return {
        success: true,
        batches_checked: batchesChecked,
        batches_completed: batchesCompleted,
        total_analyses_saved: totalSaved,
        total_failed: totalFailed,
        results: results,
        message: `Checked ${batchesChecked} batches, completed ${batchesCompleted}`,
      };
    } catch (error) {
      console.error('Batch status processing failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBatchSummary() {
    try {
      const { data: summary, error } = await supabase
        .from('batch_jobs')
        .select('status, type, count(*)')
        .group('status, type');

      if (error) throw error;

      return summary || [];
    } catch (error) {
      console.error('Error getting batch summary:', error);
      return [];
    }
  }
}

export default async function handler(req, res) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For GET requests, return batch summary (no auth required)
  if (req.method === 'GET') {
    try {
      const processor = new RailwayBatchStatusProcessor();
      const summary = await processor.getBatchSummary();

      return res.status(200).json({
        success: true,
        batch_summary: summary,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // For POST requests (cron jobs), verify auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const processor = new RailwayBatchStatusProcessor();
    const result = await processor.processBatch();

    // Log the result
    console.log('Batch status processing result:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Batch status processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
