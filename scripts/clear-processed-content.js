#!/usr/bin/env node

/**
 * Clear All Processed Content - Fresh Start Script
 * 
 * Removes all processed_content from movie_analyses to start fresh.
 * This clears corrupted double-nested HTML links and resets linking flags.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Railway PostgreSQL connection
function getRailwayPool() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Pool({
    connectionString: dbUrl,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

async function clearProcessedContent() {
  console.log('🧹 Clear All Processed Content - Fresh Start');
  console.log('============================================');
  
  const pool = getRailwayPool();
  
  try {
    console.log('✅ Connected to Railway PostgreSQL');
    
    // Count records with processed_content
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM movie_analyses 
      WHERE claude_response->>'processed_content' IS NOT NULL
    `);
    
    const recordsWithProcessed = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${recordsWithProcessed} records with processed_content`);
    
    if (recordsWithProcessed === 0) {
      console.log('✅ No processed content to clear');
      return;
    }
    
    console.log('🗑️  Clearing all processed_content and resetting link flags...');
    
    // Clear processed_content and reset linking flags
    const updateResult = await pool.query(`
      UPDATE movie_analyses 
      SET 
        claude_response = claude_response - 'processed_content',
        has_links = false,
        link_count = 0,
        linked_at = NULL
      WHERE claude_response->>'processed_content' IS NOT NULL
    `);
    
    console.log(`✅ Cleared processed_content from ${updateResult.rowCount} records`);
    console.log(`🔄 Reset has_links=false, link_count=0 for fresh processing`);
    
    // Verify cleanup
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM movie_analyses 
      WHERE claude_response->>'processed_content' IS NOT NULL
    `);
    
    const remaining = parseInt(verifyResult.rows[0].count);
    console.log(`📋 Verification: ${remaining} records still have processed_content`);
    
    if (remaining === 0) {
      console.log('🎉 SUCCESS: All processed content cleared successfully!');
      console.log('📝 Ready for fresh batch processing with clean data');
    } else {
      console.log('⚠️  Some records may not have been cleared');
    }
    
  } catch (error) {
    console.error('💥 Error clearing processed content:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('🔒 Database connection closed');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Clear Processed Content Usage:

  # Clear all processed content (fresh start):
  node scripts/clear-processed-content.js

This will:
- Remove all processed_content from claude_response
- Reset has_links=false, link_count=0, linked_at=NULL
- Prepare for fresh batch processing without corrupted data
`);
    process.exit(0);
  }
  
  try {
    await clearProcessedContent();
  } catch (error) {
    console.error('💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { clearProcessedContent };