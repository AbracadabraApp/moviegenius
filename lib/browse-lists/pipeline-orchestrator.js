/**
 * Browse List Pipeline Orchestrator
 * 
 * Main orchestration system for processing 19k movie analyses through Claude
 * to generate the polyhierarchical browse list taxonomy.
 */

import { BrowseListProcessor } from './claude-processor.js';
import { getRailwayClient } from '../railway-db.js';

class BrowseListPipelineOrchestrator {
  constructor() {
    this.processor = new BrowseListProcessor(
      process.env.ANTHROPIC_API_KEY,
      process.env.DATABASE_URL
    );
    
    this.batchSize = 10; // Process 10 movies at a time for manageable batches
    this.maxRetries = 3;
    this.delayBetweenBatches = 2000; // 2 seconds between batches
    this.progressReportInterval = 50; // Report progress every 50 movies
  }

  /**
   * Start the browse list generation process
   */
  async startBrowseListGeneration(config = {}) {
    const {
      analysisFilter = {},
      targetListCount = 1000,
      focusFacets = ['genre', 'theme', 'location', 'time'],
      jobDescription = 'Initial browse list generation from movie analyses'
    } = config;

    console.log('🚀 Starting Browse List Generation Pipeline');
    console.log(`📊 Target: ${targetListCount}+ lists`);
    console.log(`🎯 Focus facets: ${focusFacets.join(', ')}`);

    // 1. Create processing job record
    const jobId = await this.createProcessingJob({
      jobDescription,
      targetListCount,
      focusFacets,
      analysisFilter
    });

    console.log(`🆔 Created processing job: ${jobId}`);

    try {
      // 2. Get all movie analyses to process
      const movies = await this.getMoviesToProcess(analysisFilter);
      console.log(`📽️ Found ${movies.length} movies with analyses to process`);

      if (movies.length === 0) {
        await this.updateJobStatus(jobId, 'completed', 'No movies found to process');
        return { success: true, message: 'No movies to process', jobId };
      }

      // 3. Update job with actual movie count
      await this.updateJobMovieCount(jobId, movies.length);

      // 4. Process movies in batches
      const results = await this.processBatches(jobId, movies);

      // 5. Finalize job
      await this.finalizeJob(jobId, results);

      console.log('✅ Browse list generation pipeline completed successfully');
      return {
        success: true,
        jobId,
        results,
        totalMovies: movies.length,
        listsCreated: results.totalListsCreated,
        listsUpdated: results.totalListsUpdated,
        totalCost: results.totalCost
      };

    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      await this.updateJobStatus(jobId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Process movies in manageable batches
   */
  async processBatches(jobId, movies) {
    const totalBatches = Math.ceil(movies.length / this.batchSize);
    let processedCount = 0;
    let totalCost = 0;
    let totalListsCreated = 0;
    let totalListsUpdated = 0;
    let errors = [];

    console.log(`🔄 Processing ${movies.length} movies in ${totalBatches} batches of ${this.batchSize}`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * this.batchSize;
      const batchEnd = Math.min(batchStart + this.batchSize, movies.length);
      const batch = movies.slice(batchStart, batchEnd);

      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} movies)`);

      try {
        // Get fresh context for this batch (existing lists and facets)
        const existingListsContext = await this.processor.getExistingListsContext(200);
        const existingFacetsContext = await this.processor.getExistingFacetsContext();

        // Process each movie in the batch
        for (const movie of batch) {
          try {
            await this.processSingleMovie(jobId, movie, existingListsContext, existingFacetsContext);
            processedCount++;
            
            // Log progress periodically
            if (processedCount % this.progressReportInterval === 0) {
              console.log(`📈 Progress: ${processedCount}/${movies.length} movies (${((processedCount/movies.length)*100).toFixed(1)}%)`);
            }
            
          } catch (movieError) {
            console.error(`❌ Failed to process movie ${movie.tmdb_id} (${movie.title}):`, movieError);
            errors.push({
              movieId: movie.tmdb_id,
              title: movie.title,
              error: movieError.message
            });
          }
        }

        // Brief pause between batches to avoid overwhelming the API
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
        }

      } catch (batchError) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, batchError);
        errors.push({
          batch: batchIndex + 1,
          error: batchError.message
        });
      }
    }

    // Get final job metrics from database
    const jobMetrics = await this.getJobMetrics(jobId);
    
    return {
      processedCount,
      totalListsCreated: jobMetrics.lists_created || 0,
      totalListsUpdated: jobMetrics.lists_updated || 0,
      totalCost: jobMetrics.total_cost || 0,
      errors,
      successRate: ((processedCount - errors.length) / processedCount * 100).toFixed(1) + '%'
    };
  }

  /**
   * Process a single movie through Claude
   */
  async processSingleMovie(jobId, movie, existingListsContext, existingFacetsContext) {
    // Format movie analysis for Claude processing
    const movieAnalysis = {
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      overview: movie.overview,
      analysis: movie.claude_response || movie.analysis,
      genres: movie.genres,
      cast: movie.cast_info,
      crew: movie.crew_info
    };

    // Process through Claude
    const processingResult = await this.processor.processMovieAnalysis(
      movieAnalysis,
      existingListsContext,
      existingFacetsContext
    );

    // Apply results to database
    const applyResult = await this.processor.applyProcessingResults(processingResult, jobId);

    console.log(`✅ ${movie.title}: ${applyResult.listsCreated} created, ${applyResult.listsUpdated} updated`);
    
    return applyResult;
  }

  /**
   * Get movies that need browse list processing
   */
  async getMoviesToProcess(filter = {}) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        SELECT 
          m.id,
          m.tmdb_id,
          m.title,
          m.year,
          m.overview,
          m.genres,
          m.cast_info,
          m.crew_info,
          ma.claude_response,
          ma.created_at as analysis_created_at
        FROM movies m
        INNER JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE ma.claude_response IS NOT NULL 
          AND LENGTH(ma.claude_response::text) > 500
          ${filter.minYear ? `AND m.year >= $1` : ''}
          ${filter.maxYear ? `AND m.year <= $${filter.minYear ? 2 : 1}` : ''}
        ORDER BY ma.created_at DESC
        ${filter.limit ? `LIMIT ${filter.limit}` : ''}
      `;

      const params = [];
      if (filter.minYear) params.push(filter.minYear);
      if (filter.maxYear) params.push(filter.maxYear);

      const result = await client.query(query, params);
      return result.rows;

    } finally {
      await client.end();
    }
  }

  /**
   * Create a new processing job record
   */
  async createProcessingJob(config) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        INSERT INTO browse_list_jobs (
          job_type,
          status,
          prompt_version,
          target_list_count,
          facet_focus,
          configuration
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const result = await client.query(query, [
        'initial_generation',
        'processing',
        '1.0',
        config.targetListCount,
        JSON.stringify(config.focusFacets),
        JSON.stringify(config)
      ]);

      return result.rows[0].id;

    } finally {
      await client.end();
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, errorMessage = null) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        UPDATE browse_list_jobs
        SET 
          status = $1,
          ${status === 'completed' ? 'completed_at = NOW(),' : ''}
          ${status === 'processing' ? 'started_at = NOW(),' : ''}
          ${errorMessage ? 'error_message = $3,' : ''}
          updated_at = NOW()
        WHERE id = $2
      `;

      const params = [status, jobId];
      if (errorMessage) params.push(errorMessage);

      await client.query(query, params);

    } finally {
      await client.end();
    }
  }

  /**
   * Update job movie count
   */
  async updateJobMovieCount(jobId, movieCount) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        UPDATE browse_list_jobs
        SET movie_count = $1
        WHERE id = $2
      `;

      await client.query(query, [movieCount, jobId]);

    } finally {
      await client.end();
    }
  }

  /**
   * Get job metrics
   */
  async getJobMetrics(jobId) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        SELECT 
          lists_created,
          lists_updated,
          movies_assigned,
          total_cost,
          status
        FROM browse_list_jobs
        WHERE id = $1
      `;

      const result = await client.query(query, [jobId]);
      return result.rows[0] || {};

    } finally {
      await client.end();
    }
  }

  /**
   * Finalize job with summary metrics
   */
  async finalizeJob(jobId, results) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        UPDATE browse_list_jobs
        SET 
          status = 'completed',
          completed_at = NOW(),
          error_message = CASE 
            WHEN $3 > 0 THEN $4 
            ELSE NULL 
          END
        WHERE id = $1
      `;

      const errorSummary = results.errors.length > 0 
        ? `${results.errors.length} movies failed processing. Success rate: ${results.successRate}`
        : null;

      await client.query(query, [
        jobId, 
        results.processedCount,
        results.errors.length,
        errorSummary
      ]);

      console.log(`📊 Job ${jobId} finalized:`);
      console.log(`  • Movies processed: ${results.processedCount}`);
      console.log(`  • Lists created: ${results.totalListsCreated}`);
      console.log(`  • Lists updated: ${results.totalListsUpdated}`);
      console.log(`  • Total cost: $${results.totalCost.toFixed(4)}`);
      console.log(`  • Success rate: ${results.successRate}`);
      
      if (results.errors.length > 0) {
        console.log(`  • Errors: ${results.errors.length}`);
      }

    } finally {
      await client.end();
    }
  }

  /**
   * Get current job status
   */
  async getJobStatus(jobId) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        SELECT 
          *,
          EXTRACT(EPOCH FROM (NOW() - started_at)) as runtime_seconds
        FROM browse_list_jobs
        WHERE id = $1
      `;

      const result = await client.query(query, [jobId]);
      return result.rows[0] || null;

    } finally {
      await client.end();
    }
  }
}

export { BrowseListPipelineOrchestrator };