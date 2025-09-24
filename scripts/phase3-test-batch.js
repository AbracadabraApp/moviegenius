#!/usr/bin/env node

/**
 * Phase 3: Test Batch Generation
 *
 * Small test batch to validate the mass generation process
 * before running on all 19,000+ movies.
 */

import { assembleEnhancedMovieData, closePool } from '../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_BATCH_SIZE = 10;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'enhanced-movies');

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

async function runTestBatch() {
  const startTime = Date.now();

  try {
    console.log('🧪 Phase 3: Test Batch Generation');
    console.log(`Generating ${TEST_BATCH_SIZE} enhanced static files for validation...`);

    // Get test movies
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        m.tmdb_id,
        m.title,
        m.year
      FROM movies m
      JOIN movie_analyses ma ON m.id = ma.movie_id
        AND ma.analysis_type = 'general'
        AND ma.enhanced_format = true
        AND ma.enhanced_sections IS NOT NULL
      JOIN enhanced_why_watch eww ON eww.tmdb_id = m.tmdb_id
      JOIN more_ideas mi ON mi.tmdb_id = m.tmdb_id
      ORDER BY m.tmdb_id
      LIMIT $1
    `, [TEST_BATCH_SIZE]);

    client.release();

    console.log(`\nSelected ${result.rows.length} test movies:`);
    result.rows.forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
    });

    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Generate files
    console.log('\n📁 Generating enhanced static files...');
    const results = [];

    for (let i = 0; i < result.rows.length; i++) {
      const movie = result.rows[i];
      const movieStartTime = Date.now();

      try {
        // Generate enhanced data
        const enhancedData = await assembleEnhancedMovieData(movie.tmdb_id, pool);

        // Write file
        const filename = `movie-${movie.tmdb_id}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        const jsonContent = JSON.stringify(enhancedData, null, 2);

        await fs.writeFile(filepath, jsonContent);

        // Verify file
        const fileStats = await fs.stat(filepath);
        const duration = Date.now() - movieStartTime;

        console.log(`  ✅ ${movie.title} → ${filename} (${fileStats.size} bytes, ${duration}ms)`);

        results.push({
          success: true,
          tmdbId: movie.tmdb_id,
          title: movie.title,
          filename,
          fileSize: fileStats.size,
          duration,
          error: null
        });

      } catch (error) {
        const duration = Date.now() - movieStartTime;
        console.log(`  ❌ ${movie.title} - ERROR: ${error.message} (${duration}ms)`);

        results.push({
          success: false,
          tmdbId: movie.tmdb_id,
          title: movie.title,
          filename: null,
          fileSize: 0,
          duration,
          error: error.message
        });
      }
    }

    // Summary
    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgFileSize = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.fileSize, 0) / successful.length
      : 0;
    const avgDuration = results.length > 0
      ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
      : 0;

    console.log('\n📊 Test Batch Results:');
    console.log(`  Success: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
    console.log(`  Failed: ${failed.length}`);
    console.log(`  Avg file size: ${(avgFileSize/1024).toFixed(1)} KB`);
    console.log(`  Avg generation time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Total time: ${(totalDuration/1000).toFixed(1)}s`);

    if (failed.length > 0) {
      console.log('\n❌ Failed movies:');
      failed.forEach(f => console.log(`  - ${f.title}: ${f.error}`));
    }

    // Quality check on successful files
    if (successful.length > 0) {
      console.log('\n🔍 Quality Validation:');
      const sampleFile = successful[0];
      const filepath = path.join(OUTPUT_DIR, sampleFile.filename);
      const content = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(content);

      console.log(`  Sample file: ${sampleFile.filename}`);
      console.log(`  Structure check:`);
      console.log(`    - enhancedFormat: ${data.enhancedFormat}`);
      console.log(`    - staticGenerated: ${data.staticGenerated}`);
      console.log(`    - movieHeader: ${!!data.movieHeader}`);
      console.log(`    - analysis.sections: ${data.analysis?.sections?.length || 0} sections`);
      console.log(`    - analysis.whyWatch: ${data.analysis?.whyWatch?.recommendation}`);
      console.log(`    - analysis.moreIdeas: ${data.analysis?.moreIdeas?.length || 0} ideas`);
      console.log(`    - buildData.linksProcessed: ${data.buildData?.linksProcessed}`);

      // Performance check
      const loadStartTime = Date.now();
      JSON.parse(content);
      const parseTime = Date.now() - loadStartTime;
      console.log(`  Parse performance: ${parseTime}ms (target: <5ms)`);
    }

    // Recommendations for full batch
    console.log('\n🚀 Full Batch Recommendations:');

    if (successful.length === results.length) {
      console.log('  ✅ All test files generated successfully');
      console.log(`  ⏱️  Estimated full generation time: ${(19344 * avgDuration / 1000 / 60 / 60).toFixed(1)} hours`);
      console.log(`  💾 Estimated storage needed: ${(19344 * avgFileSize / 1024 / 1024).toFixed(0)} MB`);
      console.log('  🎯 Ready for full mass generation!');
    } else {
      console.log(`  ⚠️  ${failed.length} failures detected - investigate before full batch`);
    }

    return results;

  } catch (error) {
    console.error('❌ Test batch failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run test batch
runTestBatch().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});