#!/usr/bin/env node

/**
 * Apply use/don't use flags to movie lists schema
 * Simple deduplication approach using boolean flags
 */

import { getPool } from '../lib/railway-db.js';
import fs from 'fs';

async function applyListFlags() {
  console.log('🏗️ Adding use/don\'t use flags to movie lists schema...');
  
  const pool = getPool();
  
  try {
    // Read and execute the SQL schema updates
    const sqlContent = fs.readFileSync('./scripts/add-list-flags.sql', 'utf8');
    await pool.query(sqlContent);
    
    console.log('✅ Successfully added use_flag column to movie_lists table');
    
    // Check the updated schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'movie_lists' 
      AND column_name IN ('use_flag', 'created_at')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Updated schema:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'null'})`);
    });
    
    // Show sample of flagged lists
    const sampleResult = await pool.query(`
      SELECT name, movie_count, use_flag, created_at
      FROM movie_lists 
      WHERE use_flag = true
      ORDER BY movie_count DESC 
      LIMIT 10
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n🎬 Sample active lists (use_flag = true):');
      sampleResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. "${row.name}" (${row.movie_count} movies) - ${row.created_at?.toDateString() || 'no date'}`);
      });
    }
    
    console.log('\n✅ List flags system ready for simple deduplication management');
    
  } catch (error) {
    console.error('❌ Failed to apply list flags:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
applyListFlags()
  .then(() => {
    console.log('\n🎉 List flags applied successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Failed to apply list flags:', error.message);
    process.exit(1);
  });