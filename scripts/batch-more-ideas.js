/**
 * DATABASE-FIXED Batch More Ideas Generator
 * 
 * Fixed version with robust database handling and detailed logging
 * to identify exactly why movies aren't saving.
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add connection event logging
  log: (msg) => console.log('DB:', msg)
});

// Test database connection on startup
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

const CONFIG = {
  batchSize: 25,
  pollInterval: 30000,
  maxWaitMinutes: null,  // Remove timeout - process continuously until complete
  progressFile: 'batch-progress.json'
};

/**
 * Verify database schema and connectivity
 */
async function verifyDatabase() {
  console.log('\n🔍 Verifying database setup...');
  
  try {
    // Test basic connectivity
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✓ Database connection successful');
    console.log(`  Current time: ${result.rows[0].current_time}`);
    
    // Check if more_ideas table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'more_ideas'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table "more_ideas" does not exist');
      console.log('Creating table...');
      
      await pool.query(`
        CREATE TABLE more_ideas (
          id SERIAL PRIMARY KEY,
          analysis_id UUID,
          movie_id UUID,
          tmdb_id INTEGER UNIQUE NOT NULL,
          ideas JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('✓ Table "more_ideas" created');
    } else {
      console.log('✓ Table "more_ideas" exists');
    }
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'more_ideas'
      ORDER BY ordinal_position;
    `);
    
    console.log('✓ Table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Test insert capability
    const testTmdbId = 999999; // Use a high number unlikely to conflict
    
    // Clean up any existing test record
    await pool.query('DELETE FROM more_ideas WHERE tmdb_id = $1', [testTmdbId]);
    
    // Test insert
    await pool.query(`
      INSERT INTO more_ideas (analysis_id, movie_id, tmdb_id, ideas, metadata, created_at, updated_at)
      VALUES (NULL, NULL, $1, $2, $3, NOW(), NOW())
    `, [
      testTmdbId,
      JSON.stringify([{"title": "Test Movie", "year": 2023, "connection": "Test connection"}]),
      JSON.stringify({"test": true, "sourceMovie": "Test Movie (2023)"})
    ]);
    
    console.log('✓ Test insert successful');
    
    // Clean up test record
    await pool.query('DELETE FROM more_ideas WHERE tmdb_id = $1', [testTmdbId]);
    console.log('✓ Test cleanup successful');
    
    // Count existing records
    const count = await pool.query('SELECT COUNT(*) as count FROM more_ideas');
    console.log(`✓ Current records in more_ideas: ${count.rows[0].count}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

/**
 * Simple progress tracker
 */
class ProgressTracker {
  constructor() {
    this.batches = [];
    this.load();
  }

  addBatch(batchId, movieCount) {
    this.batches.push({
      id: batchId,
      movieCount,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    this.save();
  }

  updateStatus(batchId, status, results = null) {
    const batch = this.batches.find(b => b.id === batchId);
    if (batch) {
      batch.status = status;
      batch.updatedAt = new Date().toISOString();
      if (results) {
        batch.results = results;
      }
      this.save();
    }
  }

  save() {
    try {
      writeFileSync(CONFIG.progressFile, JSON.stringify(this.batches, null, 2));
    } catch (error) {
      console.warn('Could not save progress file:', error.message);
    }
  }

  load() {
    if (existsSync(CONFIG.progressFile)) {
      try {
        const fileContent = readFileSync(CONFIG.progressFile, 'utf8');
        const parsed = JSON.parse(fileContent);
        
        // Ensure parsed data is an array
        if (Array.isArray(parsed)) {
          this.batches = parsed;
          console.log(`Loaded ${this.batches.length} batches from progress file`);
        } else {
          console.warn('Progress file contains invalid data, resetting to empty array');
          this.batches = [];
        }
      } catch (error) {
        console.warn('Could not load progress file:', error.message);
        this.batches = [];
      }
    } else {
      // Ensure batches is always an array
      this.batches = [];
    }
  }
}

/**
 * Get movies that need processing
 */
async function getMoviesNeedingMoreIdeas(limit, offset = 0) {
  console.log(`\n🔍 Finding movies that need More Ideas (limit: ${limit || 'none'}, offset: ${offset})...`);
  
  try {
    const query = `
      SELECT m.tmdb_id, m.title, m.year
      FROM movies m
      LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
      WHERE mi.tmdb_id IS NULL
      AND m.tmdb_id IS NOT NULL
      ORDER BY m.tmdb_id
      LIMIT $1 OFFSET $2
    `;
    
    const actualLimit = limit || 1000;
    const result = await pool.query(query, [actualLimit, offset]);
    
    console.log(`✓ Found ${result.rows.length} movies needing More Ideas`);
    
    // Show first few movies for verification
    if (result.rows.length > 0) {
      console.log('First few movies:');
      result.rows.slice(0, 5).forEach((movie, i) => {
        console.log(`  ${i + 1}. ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
      });
      if (result.rows.length > 5) {
        console.log(`  ... and ${result.rows.length - 5} more`);
      }
    }
    
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error fetching movies:', error.message);
    throw error;
  }
}

/**
 * Create batch requests
 */
function createBatchRequests(movies) {
  console.log(`\n📝 Creating batch requests for ${movies.length} movies...`);
  
  return movies.map(movie => {
    const movieTitle = `${movie.title} (${movie.year})`;
    
    const prompt = `You are a passionate film expert who gets straight to the point. Skip the fluff and dive into great movies.

Generate 15 movie recommendations for: ${movieTitle}

Each recommendation should connect to the source film - similar themes, director, genre, mood, or style.

Connection descriptions should be clear and helpful (under 20 words). Explain WHY someone who enjoyed the source film would like this recommendation.

Return ONLY valid JSON in this exact format:
{
  "moreIdeas": [
    {"title": "Movie Title", "year": 1999, "connection": "Brief reason why it's similar"}
  ],
  "metadata": {"sourceMovie": "${movieTitle}", "totalRecommendations": 15}
}`;

    return {
      custom_id: `movie-${movie.tmdb_id}`,
      params: {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    };
  });
}

/**
 * Submit a batch
 */
async function submitBatch(movies, batchNumber) {
  if (!movies || movies.length === 0) {
    throw new Error(`Batch ${batchNumber} has no movies`);
  }

  console.log(`\n📤 Submitting batch ${batchNumber} with ${movies.length} movies...`);
  
  const requests = createBatchRequests(movies);
  
  try {
    const batch = await anthropic.beta.messages.batches.create({
      requests: requests
    });
    
    console.log(`✓ Batch ${batchNumber} submitted successfully`);
    console.log(`  Batch ID: ${batch.id}`);
    console.log(`  Status: ${batch.processing_status}`);
    console.log(`  Requests: ${batch.request_counts?.processing || 0} processing, ${batch.request_counts?.pending || 0} pending`);
    
    return batch;
  } catch (error) {
    console.error(`❌ Failed to submit batch ${batchNumber}:`, error.message);
    throw error;
  }
}

/**
 * Wait for batch completion
 */
async function waitForCompletion(batchId, batchNumber, tracker) {
  console.log(`\n⏳ Waiting for batch ${batchNumber} to complete...`);
  console.log(`   Batch ID: ${batchId}`);
  
  const startTime = Date.now();
  const maxWait = CONFIG.maxWaitMinutes ? CONFIG.maxWaitMinutes * 60 * 1000 : null;
  let pollCount = 0;

  while (!maxWait || Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      pollCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(`  📊 Poll ${pollCount} (${elapsed}m): ${batch.processing_status}`);
      
      if (batch.request_counts) {
        const { processing = 0, pending = 0, succeeded = 0, errored = 0 } = batch.request_counts;
        console.log(`     Processing: ${processing}, Pending: ${pending}, Succeeded: ${succeeded}, Errored: ${errored}`);
      }
      
      tracker.updateStatus(batchId, batch.processing_status);
      
      if (batch.processing_status === 'ended') {
        console.log(`✅ Batch ${batchNumber} completed in ${elapsed} minutes`);
        console.log(`   Final results: ${batch.request_counts?.succeeded || 0} success, ${batch.request_counts?.errored || 0} failed`);
        return batch;
      }
      
      if (batch.processing_status === 'failed' || batch.processing_status === 'canceled') {
        throw new Error(`Batch ${batchNumber} ${batch.processing_status}`);
      }
      
    } catch (error) {
      if (error.message.includes('failed') || error.message.includes('canceled')) {
        throw error;
      }
      console.error(`⚠️  Error checking batch ${batchNumber}:`, error.message);
    }
  }
  
  throw new Error(`Batch ${batchNumber} failed to complete after polling`);
}

/**
 * Process a single result with extensive logging
 */
async function processResult(result, movieMap, batchNumber) {
  // Extensive validation and logging
  if (!result) {
    return { success: false, error: 'Null result object' };
  }
  
  if (!result.custom_id) {
    return { success: false, error: 'Missing custom_id in result' };
  }

  const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
  
  if (isNaN(tmdbId)) {
    return { success: false, error: `Invalid TMDB ID parsed from custom_id: ${result.custom_id}` };
  }
  
  const movie = movieMap.get(tmdbId);
  
  if (!movie) {
    return { 
      success: false, 
      tmdbId, 
      error: `Movie not found in movieMap for TMDB ID: ${tmdbId}` 
    };
  }
  
  // Check if request succeeded
  if (result.result?.type !== 'succeeded') {
    const errorMsg = result.result?.error?.message || `Request failed with type: ${result.result?.type}`;
    return {
      success: false,
      tmdbId,
      title: movie.title,
      error: errorMsg
    };
  }

  try {
    // Extract content and usage with validation
    const content = result.result.message?.content?.[0]?.text;
    const usage = result.result.message?.usage;
    
    if (!content) {
      return { 
        success: false, 
        tmdbId, 
        title: movie.title, 
        error: 'Empty or missing response content' 
      };
    }
    
    console.log(`    📄 Processing response for ${movie.title} (${movie.year})`);
    console.log(`       Content preview: ${content.substring(0, 100)}...`);
    
    // Parse JSON with detailed error handling
    let response;
    try {
      response = JSON.parse(content);
    } catch (parseError) {
      console.log(`       ❌ JSON Parse Error: ${parseError.message}`);
      console.log(`       Raw content: ${content}`);
      return { 
        success: false, 
        tmdbId, 
        title: movie.title, 
        error: `JSON parse error: ${parseError.message}` 
      };
    }
    
    // Validate response structure
    if (!response.moreIdeas || !Array.isArray(response.moreIdeas)) {
      console.log(`       ❌ Invalid response structure:`, response);
      return { 
        success: false, 
        tmdbId, 
        title: movie.title, 
        error: 'Missing or invalid moreIdeas array' 
      };
    }
    
    if (response.moreIdeas.length === 0) {
      return { 
        success: false, 
        tmdbId, 
        title: movie.title, 
        error: 'Empty moreIdeas array' 
      };
    }
    
    console.log(`       ✓ Valid response with ${response.moreIdeas.length} recommendations`);
    
    // Prepare data for database
    const ideasJson = JSON.stringify(response.moreIdeas);
    const metadataJson = JSON.stringify({
      sourceMovie: `${movie.title} (${movie.year})`,
      generatedAt: new Date().toISOString(),
      recommendationCount: response.moreIdeas.length,
      batchNumber: batchNumber
    });
    
    console.log(`       💾 Saving to database...`);
    
    // Save to database with detailed error handling
    try {
      const insertResult = await pool.query(`
        INSERT INTO more_ideas (analysis_id, movie_id, tmdb_id, ideas, metadata, created_at, updated_at)
        VALUES (NULL, NULL, $1, $2, $3, NOW(), NOW())
        ON CONFLICT (tmdb_id) DO UPDATE SET
          ideas = EXCLUDED.ideas,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, tmdb_id
      `, [tmdbId, ideasJson, metadataJson]);
      
      console.log(`       ✅ Successfully saved with ID: ${insertResult.rows[0].id}`);
      
      // Verify the save by reading it back
      const verifyResult = await pool.query('SELECT COUNT(*) as count FROM more_ideas WHERE tmdb_id = $1', [tmdbId]);
      console.log(`       ✓ Verification: ${verifyResult.rows[0].count} record(s) found`);
      
      // Calculate cost (batch API gets 50% discount)
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      const cost = ((inputTokens * 3) + (outputTokens * 15)) / 1000000 * 0.5; // 50% batch discount
      
      return {
        success: true,
        tmdbId,
        title: movie.title,
        recommendations: response.moreIdeas.length,
        dbId: insertResult.rows[0].id,
        cost,
        tokens: { input: inputTokens, output: outputTokens }
      };
      
    } catch (dbError) {
      console.log(`       ❌ Database save failed: ${dbError.message}`);
      console.log(`       Full DB error:`, dbError);
      return {
        success: false,
        tmdbId,
        title: movie.title,
        error: `Database error: ${dbError.message}`
      };
    }
    
  } catch (error) {
    console.log(`    ❌ Unexpected error processing ${movie.title}:`, error);
    return {
      success: false,
      tmdbId,
      title: movie.title,
      error: `Processing error: ${error.message}`
    };
  }
}

/**
 * Process all results from completed batch
 */
async function processResults(batch, movies, batchNumber) {
  console.log(`\n🔄 Processing results for batch ${batchNumber}...`);
  console.log(`   Expected ${movies.length} results`);
  
  // Create movie map for fast lookup
  const movieMap = new Map(movies.map(m => [m.tmdb_id, m]));
  console.log(`   Created movie map with ${movieMap.size} entries`);
  
  let successful = 0;
  let failed = 0;
  let processed = 0;
  let totalBatchCost = 0;
  
  try {
    const resultsStream = await anthropic.beta.messages.batches.results(batch.id);
    console.log(`   ✓ Retrieved results stream`);
    
    for await (const result of resultsStream) {
      processed++;
      console.log(`\n   📋 Processing result ${processed}/${movies.length}`);
      
      const processedResult = await processResult(result, movieMap, batchNumber);
      
      if (processedResult.success) {
        successful++;
        totalBatchCost += processedResult.cost || 0;
        console.log(`   ✅ SUCCESS: ${processedResult.title} (${processedResult.recommendations} recommendations, $${processedResult.cost?.toFixed(4) || '0.0000'}, DB ID: ${processedResult.dbId})`);
      } else {
        failed++;
        console.log(`   ❌ FAILED: ${processedResult.title || 'Unknown'}`);
        console.log(`      Error: ${processedResult.error}`);
      }
      
      // Brief pause to avoid overwhelming the logs
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n   📊 Results processing complete:`);
    console.log(`      Processed: ${processed}/${movies.length}`);
    console.log(`      Successful: ${successful}`);
    console.log(`      Failed: ${failed}`);
    console.log(`      Total Cost: $${totalBatchCost.toFixed(4)}`);
    
    if (processed !== movies.length) {
      console.log(`   ⚠️  Warning: Expected ${movies.length} results but processed ${processed}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing results for batch ${batchNumber}:`, error.message);
    console.error('Full error:', error);
    failed = movies.length - successful;
  }
  
  const results = { successful, failed, processed, cost: totalBatchCost };
  console.log(`\n✅ Batch ${batchNumber} final results: ${successful} successful, ${failed} failed, $${totalBatchCost.toFixed(4)} cost`);
  
  return results;
}

/**
 * Main function with comprehensive error handling
 */
async function main() {
  try {
    console.log('🎬 Database-Fixed Batch More Ideas Generator');
    console.log('===========================================');
    
    // First, verify database connectivity and schema
    const dbOk = await verifyDatabase();
    if (!dbOk) {
      console.log('❌ Database verification failed. Cannot continue.');
      process.exit(1);
    }
    
    // Parse arguments
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
    const offsetArg = args.find(arg => arg.startsWith('--offset='));
    
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    const customBatchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : null;
    const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;
    const dryRun = args.includes('--dry-run');

    // Apply custom batch size
    if (customBatchSize && customBatchSize > 0 && customBatchSize <= 100) {
      CONFIG.batchSize = customBatchSize;
    }

    console.log(`\n⚙️  Configuration:`);
    console.log(`   Limit: ${limit || 'No limit'}`);
    console.log(`   Offset: ${offset}`);
    console.log(`   Batch size: ${CONFIG.batchSize}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);

    const tracker = new ProgressTracker();
    
    // Get movies to process
    const movies = await getMoviesNeedingMoreIdeas(limit, offset);
    
    if (movies.length === 0) {
      console.log('✅ No movies need processing');
      return;
    }
    
    const batchCount = Math.ceil(movies.length / CONFIG.batchSize);
    const estimatedCost = movies.length * 0.002; // Rough estimate: $0.002 per movie with batch discount
    console.log(`\n📊 Will process ${movies.length} movies in ${batchCount} batches`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} (with 50% batch discount)`);
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN - Movies that would be processed:');
      movies.slice(0, 10).forEach((movie, i) => {
        console.log(`   ${i + 1}. ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
      });
      if (movies.length > 10) {
        console.log(`   ... and ${movies.length - 10} more`);
      }
      return;
    }
    
    const allBatches = [];
    
    // Submit all batches
    console.log('\n🚀 SUBMITTING BATCHES');
    for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
      const batchMovies = movies.slice(i, i + CONFIG.batchSize);
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
      
      try {
        const batch = await submitBatch(batchMovies, batchNumber);
        
        // Add to processing list regardless of progress tracking
        allBatches.push({
          batch,
          movies: batchMovies,
          number: batchNumber
        });
        
        // Try progress tracking separately - don't fail if this breaks
        try {
          tracker.addBatch(batch.id, batchMovies.length);
        } catch (trackingError) {
          console.warn(`⚠️ Progress tracking failed for batch ${batchNumber}:`, trackingError.message);
        }
        
        // Small delay between submissions
        if (batchNumber < batchCount) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to submit batch ${batchNumber}:`, error.message);
      }
    }
    
    if (allBatches.length === 0) {
      console.log('❌ No batches were successfully submitted');
      return;
    }
    
    console.log(`\n✅ Successfully submitted ${allBatches.length}/${batchCount} batches`);
    
    // Wait for all batches to complete
    console.log('\n⏳ WAITING FOR COMPLETION');
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalProcessed = 0;
    let totalCost = 0;
    
    for (const batchInfo of allBatches) {
      try {
        console.log(`\n🔄 Processing batch ${batchInfo.number}/${allBatches.length}`);
        
        const completedBatch = await waitForCompletion(
          batchInfo.batch.id,
          batchInfo.number,
          tracker
        );
        
        const results = await processResults(
          completedBatch,
          batchInfo.movies,
          batchInfo.number
        );
        
        // Update progress tracking if possible
        try {
          tracker.updateStatus(batchInfo.batch.id, 'completed', results);
        } catch (trackingError) {
          console.warn(`⚠️ Progress tracking update failed for batch ${batchInfo.number}`);
        }
        
        totalSuccessful += results.successful;
        totalFailed += results.failed;
        totalProcessed += results.processed;
        totalCost += results.cost || 0;
        
      } catch (error) {
        console.error(`❌ Batch ${batchInfo.number} failed:`, error.message);
        
        // Try to update progress tracking
        try {
          tracker.updateStatus(batchInfo.batch.id, 'failed', { error: error.message });
        } catch (trackingError) {
          console.warn(`⚠️ Progress tracking update failed for batch ${batchInfo.number}`);
        }
        
        totalFailed += batchInfo.movies.length;
      }
    }
    
    // Final summary with database verification
    console.log('\n📈 FINAL SUMMARY');
    console.log('================');
    console.log(`Movies processed: ${totalProcessed}`);
    console.log(`Successful saves: ${totalSuccessful}`);
    console.log(`Failed saves: ${totalFailed}`);
    console.log(`Success rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`Total cost: $${totalCost.toFixed(4)}`);
    
    // Safe progress tracking access
    let completedBatchCount = 0;
    try {
      completedBatchCount = tracker.batches.filter(b => b.status === 'completed').length;
    } catch (trackingError) {
      console.warn('⚠️ Progress tracking summary failed');
    }
    console.log(`Completed batches: ${completedBatchCount}/${allBatches.length}`);
    
    // Verify final database state
    console.log('\n🔍 Final database verification...');
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM more_ideas');
    console.log(`✓ Total records in more_ideas table: ${finalCount.rows[0].count}`);
    
    if (totalSuccessful > 0) {
      console.log(`\n🎉 Processing complete! ${totalSuccessful} movies now have More Ideas in the database.`);
    } else {
      console.log(`\n⚠️  No movies were successfully saved to the database. Check the error messages above.`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Full error stack:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Improved error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  pool.end().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  pool.end().then(() => process.exit(1));
});

// Run the script
main().catch(console.error);