#!/usr/bin/env node

/**
 * Upsert Enhanced Analyses to Main Analyses Table
 *
 * Moves higher quality enhanced analyses from enhanced_analyses table
 * to the main analyses table in Railway production database.
 * This replaces older analyses with the new 4-part contextual ones.
 */

import { Pool } from 'pg';

// Railway Database (single database, two tables)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

console.log(`🔄 UPSERT ENHANCED ANALYSES TO MAIN ANALYSES TABLE`);
console.log(`📥 Source: enhanced_analyses table (higher quality)`);
console.log(`📤 Target: movie_analyses table (production/general)\\n`);

/**
 * Get new enhanced analyses to promote
 */
async function getEnhancedAnalysesToPromote() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        ea.tmdb_id,
        ea.sections,
        ea.key_elements,
        ea.created_at,
        ea.updated_at,
        m.id as movie_id
      FROM enhanced_analyses ea
      JOIN movies m ON m.tmdb_id = ea.tmdb_id
      ORDER BY ea.created_at DESC
    `);

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Upsert enhanced analyses in batch
 */
async function upsertBatchToMainAnalyses(analyses) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results = [];
    for (const analysis of analyses) {
      const result = await client.query(`
        UPDATE movie_analyses SET
          enhanced_sections = $2,
          enhanced_key_elements = $3,
          enhanced_processed_at = $4,
          enhanced_format = true,
          updated_at = NOW()
        WHERE movie_id = $1
        RETURNING id, movie_id
      `, [
        analysis.movie_id,
        analysis.sections,
        analysis.key_elements,
        analysis.created_at
      ]);

      results.push({ success: true, data: result.rows[0], tmdb_id: analysis.tmdb_id });
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main promotion process
 */
async function promoteEnhancedAnalyses() {
  console.log(`📊 Getting new enhanced analyses to promote...`);

  const analyses = await getEnhancedAnalysesToPromote();

  if (analyses.length === 0) {
    console.log('✅ No new enhanced analyses to promote');
    return;
  }

  console.log(`📥 Found ${analyses.length} enhanced analyses to promote to main table\\n`);

  let successful = 0;
  let failed = 0;
  const errors = [];

  const BATCH_SIZE = 100;

  for (let i = 0; i < analyses.length; i += BATCH_SIZE) {
    const batch = analyses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(analyses.length / BATCH_SIZE);

    console.log(`\\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} records (${i + 1}-${Math.min(i + BATCH_SIZE, analyses.length)}/${analyses.length})`);

    try {
      const results = await upsertBatchToMainAnalyses(batch);
      successful += results.length;
      console.log(`   ✅ Batch complete: ${results.length} records updated`);
    } catch (error) {
      console.log(`   ❌ Batch failed: ${error.message}`);
      failed += batch.length;
      errors.push({
        batch: batchNum,
        error: error.message
      });
    }

    // Progress update every 10 batches
    if (batchNum % 10 === 0) {
      const pct = Math.round((i / analyses.length) * 100);
      console.log(`\\n📊 Progress: ${pct}% complete (${successful} successful, ${failed} failed)`);
    }
  }

  console.log(`\\n🎉 PROMOTION COMPLETE!`);
  console.log(`📈 Total processed: ${analyses.length}`);
  console.log(`✅ Successfully promoted: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log(`\\n❌ Error details:`);
    errors.forEach(err => {
      console.log(`   TMDB ${err.tmdb_id}: ${err.error}`);
    });
  }

  // Verify final counts
  const client = await pool.connect();
  try {
    const enhancedCount = await client.query('SELECT COUNT(*) as count FROM enhanced_analyses');
    const mainCount = await client.query('SELECT COUNT(*) as count FROM movie_analyses WHERE enhanced_format = true');

    console.log(`\\n📊 Final Status:`);
    console.log(`🧪 Enhanced analyses table: ${enhancedCount.rows[0].count}`);
    console.log(`🚀 Main analyses (enhanced format): ${mainCount.rows[0].count}`);
  } finally {
    client.release();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await promoteEnhancedAnalyses();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as promoteEnhancedAnalyses };