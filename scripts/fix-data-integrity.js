#!/usr/bin/env node

/**
 * Production-Scale Data Integrity Fix Script
 * 
 * Safely fixes has_analysis flags at scale using chunked processing,
 * minimal locking, and comprehensive monitoring.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit connection pool to prevent exhaustion
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Scale-optimized configuration
const CONFIG = {
  chunkSize: 500,           // Process in smaller chunks to minimize locks
  maxBackupRows: 1000,      // Only backup flagged-true movies, not all movies
  progressInterval: 100,    // Log progress every N movies
  statementTimeout: 120000, // 2 minutes per chunk (more conservative)
  maxConcurrentChunks: 1,   // Process sequentially to avoid lock conflicts
  retryAttempts: 3,
  retryDelay: 5000          // 5 second delay between retries
};

/**
 * Get database statistics for planning
 */
async function getDatabaseStats() {
  console.log('Analyzing database scale and performance characteristics...');
  
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM movies) as total_movies,
      (SELECT COUNT(*) FROM movies WHERE has_analysis = true) as flagged_true,
      (SELECT COUNT(*) FROM movies WHERE has_analysis = false) as flagged_false,
      (SELECT COUNT(*) FROM movie_analyses WHERE analysis_type = 'general') as total_analyses,
      (SELECT pg_size_pretty(pg_total_relation_size('movies'))) as movies_table_size,
      (SELECT pg_size_pretty(pg_total_relation_size('movie_analyses'))) as analyses_table_size
  `);
  
  const data = stats.rows[0];
  
  console.log('\nDatabase Scale Analysis:');
  console.log(`Total movies: ${data.total_movies}`);
  console.log(`Movies flagged true: ${data.flagged_true}`);
  console.log(`Movies flagged false: ${data.flagged_false}`);
  console.log(`Actual analysis records: ${data.total_analyses}`);
  console.log(`Movies table size: ${data.movies_table_size}`);
  console.log(`Analyses table size: ${data.analyses_table_size}`);
  
  // Calculate estimated processing time
  const chunksNeeded = Math.ceil(data.total_movies / CONFIG.chunkSize);
  const estimatedMinutes = chunksNeeded * 0.5; // Estimate 30 seconds per chunk
  
  console.log(`\nProcessing Plan:`);
  console.log(`Chunks needed: ${chunksNeeded} (${CONFIG.chunkSize} movies each)`);
  console.log(`Estimated time: ${estimatedMinutes.toFixed(1)} minutes`);
  
  return {
    totalMovies: parseInt(data.total_movies),
    flaggedTrue: parseInt(data.flagged_true),
    totalAnalyses: parseInt(data.total_analyses),
    chunksNeeded,
    estimatedMinutes
  };
}

/**
 * Check critical database indexes for performance
 */
async function validatePerformanceIndexes() {
  console.log('\nValidating performance-critical indexes...');
  
  const indexCheck = await pool.query(`
    SELECT 
      schemaname, 
      tablename, 
      indexname, 
      indexdef
    FROM pg_indexes 
    WHERE tablename IN ('movies', 'movie_analyses')
    AND (
      indexname LIKE '%pkey%' 
      OR indexdef LIKE '%movie_id%'
      OR indexdef LIKE '%analysis_type%'
    )
    ORDER BY tablename, indexname
  `);
  
  console.log('Critical indexes found:');
  indexCheck.rows.forEach(idx => {
    console.log(`  ${idx.tablename}.${idx.indexname}`);
  });
  
  // Check for composite index on movie_analyses
  const compositeIndex = indexCheck.rows.find(idx => 
    idx.tablename === 'movie_analyses' && 
    idx.indexdef.includes('movie_id') && 
    idx.indexdef.includes('analysis_type')
  );
  
  if (!compositeIndex) {
    console.warn('WARNING: No composite index found on movie_analyses(movie_id, analysis_type)');
    console.warn('Consider creating: CREATE INDEX CONCURRENTLY idx_movie_analyses_lookup ON movie_analyses(movie_id, analysis_type);');
  }
}

/**
 * Create space-efficient backup of only problematic records
 */
async function createTargetedBackup() {
  console.log('\nCreating targeted backup of movies with has_analysis = true...');
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:\-]/g, '_');
  const backupTable = `flag_backup_${timestamp}_${randomBytes(3).toString('hex')}`;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Only backup movies flagged as true (the problematic ones)
    const backupQuery = `
      CREATE TABLE ${backupTable} AS 
      SELECT 
        id,
        tmdb_id,
        title,
        has_analysis,
        updated_at as original_updated_at,
        NOW() as backup_created_at
      FROM movies 
      WHERE has_analysis = true
      LIMIT $1
    `;
    
    await client.query(backupQuery, [CONFIG.maxBackupRows]);
    
    const count = await client.query(`SELECT COUNT(*) FROM ${backupTable}`);
    await client.query('COMMIT');
    
    console.log(`Targeted backup created: ${backupTable} (${count.rows[0].count} records)`);
    return backupTable;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Backup failed: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Process flags in chunks to minimize lock duration
 */
async function fixFlagsInChunks(totalMovies, onProgress = null) {
  console.log(`\nFixing flags in chunks of ${CONFIG.chunkSize} movies...`);
  
  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const startTime = Date.now();
  
  // Get movies in chunks using efficient pagination
  for (let offset = 0; offset < totalMovies; offset += CONFIG.chunkSize) {
    const chunkStartTime = Date.now();
    let attempt = 0;
    
    while (attempt < CONFIG.retryAttempts) {
      const client = await pool.connect();
      try {
        await client.query(`SET statement_timeout = ${CONFIG.statementTimeout}`);
        await client.query('BEGIN');
        
        // Update chunk with minimal lock duration
        const result = await client.query(`
          WITH chunk AS (
            SELECT id
            FROM movies 
            ORDER BY id
            LIMIT $1 OFFSET $2
          )
          UPDATE movies 
          SET has_analysis = EXISTS (
              SELECT 1 FROM movie_analyses 
              WHERE movie_analyses.movie_id = movies.id 
              AND analysis_type = 'general'
          ),
          updated_at = NOW()
          WHERE movies.id IN (SELECT id FROM chunk)
        `, [CONFIG.chunkSize, offset]);
        
        await client.query('COMMIT');
        
        const chunkDuration = Date.now() - chunkStartTime;
        updatedCount += result.rowCount;
        processedCount += CONFIG.chunkSize;
        
        // Progress reporting
        const progress = Math.min(processedCount, totalMovies);
        if (progress % CONFIG.progressInterval === 0 || progress === totalMovies) {
          const overallProgress = (progress / totalMovies * 100).toFixed(1);
          const elapsed = (Date.now() - startTime) / 1000 / 60;
          const eta = elapsed / progress * (totalMovies - progress);
          
          console.log(`Progress: ${progress}/${totalMovies} (${overallProgress}%) | Updated: ${updatedCount} | Time: ${elapsed.toFixed(1)}m | ETA: ${eta > 0 ? eta.toFixed(1) + 'm' : 'Complete'} | Chunk: ${chunkDuration}ms`);
        }
        
        if (onProgress) {
          onProgress(progress, totalMovies, updatedCount);
        }
        
        break; // Success, exit retry loop
        
      } catch (error) {
        await client.query('ROLLBACK');
        attempt++;
        errorCount++;
        
        console.error(`Chunk ${offset}-${offset + CONFIG.chunkSize} failed (attempt ${attempt}): ${error.message}`);
        
        if (attempt < CONFIG.retryAttempts) {
          console.log(`Retrying in ${CONFIG.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        } else {
          console.error(`Chunk failed after ${CONFIG.retryAttempts} attempts. Continuing with next chunk.`);
        }
      } finally {
        client.release();
      }
    }
  }
  
  const totalDuration = (Date.now() - startTime) / 1000 / 60;
  
  console.log(`\nChunked processing complete:`);
  console.log(`Total processed: ${processedCount}`);
  console.log(`Total updated: ${updatedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
  console.log(`Total time: ${totalDuration.toFixed(2)} minutes`);
  console.log(`Average: ${(totalDuration * 60 / Math.ceil(totalMovies / CONFIG.chunkSize)).toFixed(1)}s per chunk`);
  
  return { processedCount, updatedCount, errorCount };
}

/**
 * Fast verification using sampling for large datasets
 */
async function verifyFlagsEfficiently(sampleSize = 1000) {
  console.log(`\nVerifying flag accuracy using statistical sampling (${sampleSize} movies)...`);
  
  // Sample verification to avoid full table scan
  const sampleResult = await pool.query(`
    WITH sample_movies AS (
      SELECT id, has_analysis
      FROM movies 
      TABLESAMPLE BERNOULLI(10) -- Sample ~10% of table
      LIMIT $1
    )
    SELECT 
      sm.has_analysis as flag_value,
      COUNT(*) as count,
      COUNT(*) FILTER (
        WHERE sm.has_analysis = (ma.id IS NOT NULL)
      ) as correct_count
    FROM sample_movies sm
    LEFT JOIN movie_analyses ma ON sm.id = ma.movie_id AND ma.analysis_type = 'general'
    GROUP BY sm.has_analysis
  `, [sampleSize]);
  
  console.log('\nSample Verification Results:');
  console.log('flag_value | sample_size | correct | accuracy');
  console.log('-----------|-------------|---------|----------');
  
  let totalSample = 0;
  let totalCorrect = 0;
  
  sampleResult.rows.forEach(row => {
    const accuracy = row.count > 0 ? (row.correct_count / row.count * 100).toFixed(1) : '0.0';
    console.log(`${row.flag_value.toString().padEnd(10)} | ${row.count.toString().padEnd(11)} | ${row.correct_count.toString().padEnd(7)} | ${accuracy}%`);
    totalSample += parseInt(row.count);
    totalCorrect += parseInt(row.correct_count);
  });
  
  const overallAccuracy = totalSample > 0 ? (totalCorrect / totalSample * 100) : 0;
  console.log(`\nSample accuracy: ${overallAccuracy.toFixed(1)}% (${totalCorrect}/${totalSample})`);
  
  // If sample shows issues, do targeted verification
  if (overallAccuracy < 99) {
    console.log('Sample shows potential issues. Running targeted verification...');
    
    const problemCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM movies m
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id AND ma.analysis_type = 'general'
      WHERE m.has_analysis != (ma.id IS NOT NULL)
    `);
    
    console.log(`Full verification: ${problemCount.rows[0].count} movies still have incorrect flags`);
    return problemCount.rows[0].count === 0;
  }
  
  return overallAccuracy >= 99;
}

/**
 * Get available movies for analysis generation efficiently
 */
async function getAnalysisGenerationStats() {
  console.log('\nCalculating movies available for analysis generation...');
  
  const stats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE m.has_analysis = false AND ma.id IS NULL) as available_for_generation,
      COUNT(*) FILTER (WHERE m.has_analysis = true AND ma.id IS NOT NULL) as correctly_flagged_with_analysis,
      COUNT(*) as total_checked
    FROM movies m
    LEFT JOIN movie_analyses ma ON m.id = ma.movie_id AND ma.analysis_type = 'general'
    WHERE m.tmdb_id IS NOT NULL
  `);
  
  const data = stats.rows[0];
  
  console.log(`Movies available for analysis generation: ${data.available_for_generation}`);
  console.log(`Movies correctly flagged with analysis: ${data.correctly_flagged_with_analysis}`);
  
  return parseInt(data.available_for_generation);
}

/**
 * Generate comprehensive production report
 */
async function generateProductionReport(backupTable, processingStats, dbStats) {
  const finalStats = await pool.query(`
    SELECT 
      COUNT(*) as total_movies,
      COUNT(*) FILTER (WHERE has_analysis = true) as flagged_true,
      COUNT(*) FILTER (WHERE has_analysis = false) as flagged_false,
      (SELECT COUNT(*) FROM movie_analyses WHERE analysis_type = 'general') as actual_analyses
    FROM movies
  `);
  
  const data = finalStats.rows[0];
  
  console.log('\n=== PRODUCTION SCALE PROCESSING REPORT ===');
  console.log(`Database scale: ${data.total_movies} movies, ${data.actual_analyses} analyses`);
  console.log(`Processing method: Chunked (${CONFIG.chunkSize} movies per chunk)`);
  console.log(`Movies processed: ${processingStats.processedCount}`);
  console.log(`Movies updated: ${processingStats.updatedCount}`);
  console.log(`Processing errors: ${processingStats.errorCount}`);
  console.log(`Final state: ${data.flagged_true} flagged true, ${data.flagged_false} flagged false`);
  console.log(`Flag accuracy: ${data.flagged_true === parseInt(data.actual_analyses) ? 'PERFECT' : 'Needs review'}`);
  
  if (backupTable) {
    console.log(`Backup created: ${backupTable}`);
  }
  
  return {
    totalMovies: parseInt(data.total_movies),
    flaggedTrue: parseInt(data.flagged_true),
    actualAnalyses: parseInt(data.actual_analyses),
    isAccurate: parseInt(data.flagged_true) === parseInt(data.actual_analyses)
  };
}

/**
 * Main execution optimized for production scale
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const skipBackup = args.includes('--skip-backup');
    const skipIndexCheck = args.includes('--skip-index-check');
    const dryRun = args.includes('--dry-run');
    const chunkSizeArg = args.find(arg => arg.startsWith('--chunk-size='));
    
    // Allow chunk size override
    if (chunkSizeArg) {
      CONFIG.chunkSize = parseInt(chunkSizeArg.split('=')[1]) || CONFIG.chunkSize;
    }
    
    console.log('Production-Scale Data Integrity Fix Script');
    console.log('==========================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log(`Chunk size: ${CONFIG.chunkSize} movies`);
    console.log(`Connection pool: ${pool.options.max} connections`);
    console.log('');
    
    // Step 1: Database scale analysis
    const dbStats = await getDatabaseStats();
    
    if (!skipIndexCheck) {
      await validatePerformanceIndexes();
    }
    
    if (dryRun) {
      console.log('\nDRY RUN: Analysis complete. Add --production flag to proceed with fixes.');
      return;
    }
    
    if (dbStats.totalMovies === 0) {
      console.log('No movies found in database');
      return;
    }
    
    console.log(`\nProceeding with ${dbStats.chunksNeeded} chunks (estimated ${dbStats.estimatedMinutes.toFixed(1)} minutes)`);
    
    // Step 2: Create targeted backup
    let backupTable = null;
    if (!skipBackup) {
      backupTable = await createTargetedBackup();
    }
    
    // Step 3: Process flags in chunks
    const processingStats = await fixFlagsInChunks(dbStats.totalMovies, (progress, total, updated) => {
      // Optional: Real-time progress callback for monitoring systems
    });
    
    // Step 4: Verify results efficiently
    const verificationPassed = await verifyFlagsEfficiently();
    
    if (!verificationPassed) {
      console.warn('WARNING: Verification indicates some flags may still be incorrect');
    }
    
    // Step 5: Analysis generation statistics
    const availableCount = await getAnalysisGenerationStats();
    
    // Step 6: Production report
    const report = await generateProductionReport(backupTable, processingStats, dbStats);
    
    console.log('\n=== PRODUCTION DEPLOYMENT CHECKLIST ===');
    console.log(`1. Data integrity: ${report.isAccurate ? 'RESOLVED' : 'NEEDS ATTENTION'}`);
    console.log(`2. Available for analysis: ${availableCount} movies`);
    console.log(`3. Processing errors: ${processingStats.errorCount} (review if > 0)`);
    console.log(`4. Ready for batch analysis generation: ${report.isAccurate ? 'YES' : 'NO'}`);
    
    if (backupTable) {
      console.log(`5. Cleanup: DROP TABLE ${backupTable}; (after verification)`);
    }
    
  } catch (error) {
    console.error('\nPRODUCTION ERROR:', error.message);
    
    if (error.code) {
      console.error(`Database error code: ${error.code}`);
    }
    
    console.error('\nRecommendations:');
    console.error('1. Check database connection and permissions');
    console.error('2. Verify sufficient disk space for operations');
    console.error('3. Consider running during low-traffic period');
    console.error('4. Review database logs for additional context');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Production-grade signal handling
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT - initiating graceful shutdown...');
  console.log('Current chunk will complete, then process will exit');
  
  setTimeout(async () => {
    console.log('Force shutdown after timeout');
    try { await pool.end(); } catch {}
    process.exit(130);
  }, 30000); // 30 second grace period
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM - shutting down...');
  try {
    await pool.end();
  } catch {}
  process.exit(143);
});

// Add memory monitoring for large scale operations
process.on('warning', (warning) => {
  console.warn(`Node.js Warning: ${warning.name}: ${warning.message}`);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}