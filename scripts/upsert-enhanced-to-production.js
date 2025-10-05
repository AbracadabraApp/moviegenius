#!/usr/bin/env node

/**
 * Upsert Enhanced Analyses to 8.28 Production Database
 *
 * Copies new enhanced analyses from Railway database to Supabase production
 * for acceptance testing. Does NOT remove from source database.
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Railway Database (source)
const railwayPool = new Pool({
  connectionString: process.env.DATABASE_URL // Railway connection
});

// Supabase Production Database (target)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(`🔄 UPSERT ENHANCED ANALYSES TO PRODUCTION`);
console.log(`📥 Source: Railway Database`);
console.log(`📤 Target: Supabase Production (8.28)\\n`);

/**
 * Get new enhanced analyses from Railway
 */
async function getNewEnhancedAnalyses() {
  const client = await railwayPool.connect();
  try {
    const result = await client.query(`
      SELECT
        tmdb_id,
        sections,
        key_elements,
        created_at,
        updated_at
      FROM enhanced_analyses
      WHERE created_at > CURRENT_DATE
      ORDER BY created_at DESC
    `);

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Check if movie exists in production database
 */
async function checkMovieExists(tmdbId) {
  const { data, error } = await supabase
    .from('movies')
    .select('id, tmdb_id')
    .eq('tmdb_id', tmdbId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not "not found" error
    throw error;
  }

  return data;
}

/**
 * Upsert enhanced analysis to production
 */
async function upsertEnhancedAnalysis(analysis, movie) {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .upsert({
        movie_id: movie.id,
        tmdb_id: analysis.tmdb_id,
        sections: analysis.sections,
        key_elements: analysis.key_elements,
        enhanced_processed_at: analysis.created_at,
        enhanced_format: true
      }, {
        onConflict: 'tmdb_id'
      })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main upsert process
 */
async function upsertToProduction() {
  console.log(`📊 Getting new enhanced analyses from Railway...`);

  const analyses = await getNewEnhancedAnalyses();

  if (analyses.length === 0) {
    console.log('✅ No new analyses to upsert');
    return;
  }

  console.log(`📥 Found ${analyses.length} new enhanced analyses to upsert\\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];

    console.log(`[${i + 1}/${analyses.length}] Processing TMDB ID: ${analysis.tmdb_id}`);

    try {
      // Check if movie exists in production
      const movie = await checkMovieExists(analysis.tmdb_id);

      if (!movie) {
        console.log(`   ⚠️  Movie not found in production database - skipping`);
        skipped++;
        continue;
      }

      // Upsert the analysis
      const result = await upsertEnhancedAnalysis(analysis, movie);

      if (result.success) {
        console.log(`   ✅ Upserted successfully`);
        successful++;
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        failed++;
        errors.push({
          tmdb_id: analysis.tmdb_id,
          error: result.error
        });
      }

    } catch (error) {
      console.log(`   💥 Unexpected error: ${error.message}`);
      failed++;
      errors.push({
        tmdb_id: analysis.tmdb_id,
        error: error.message
      });
    }

    // Brief delay to avoid overwhelming Supabase
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\\n🎉 UPSERT COMPLETE!`);
  console.log(`📈 Total processed: ${analyses.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`⚠️  Skipped (movie not found): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log(`\\n❌ Error details:`);
    errors.forEach(err => {
      console.log(`   TMDB ${err.tmdb_id}: ${err.error}`);
    });
  }

  // Verify final count in production
  const { count } = await supabase
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('enhanced_format', true);

  console.log(`\\n🗄️  Enhanced analyses now in production: ${count || 'unknown'}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await upsertToProduction();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await railwayPool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as upsertEnhancedToProduction };