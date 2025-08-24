#!/usr/bin/env node
/**
 * Debug what happens after replacement
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugReplacement() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    
    const query = await client.query(`
      SELECT 
        ma.claude_response
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = 152
        AND ma.has_links = true
      LIMIT 1
    `);
    
    const processedContent = query.rows[0].claude_response.processed_content;
    
    console.log('🔍 Debug Replacement Result');
    console.log('===========================');
    
    // Show the problematic line before replacement
    const lines = processedContent.split('\n');
    console.log('BEFORE replacement:');
    console.log('Line 7:', lines[6]); // 0-indexed
    console.log('Line 8:', lines[7]);
    console.log('Line 9:', lines[8]);
    
    // Apply replacement
    const replaced = processedContent.replace(/&quot;/g, '"');
    const replacedLines = replaced.split('\n');
    
    console.log('\nAFTER replacement:');
    console.log('Line 7:', replacedLines[6]);
    console.log('Line 8:', replacedLines[7]);
    console.log('Line 9:', replacedLines[8]);
    
    // Show what happens when we try to parse line 11 which has HTML
    console.log('\nHTML content lines:');
    for (let i = 10; i < Math.min(15, replacedLines.length); i++) {
      console.log(`Line ${i + 1}:`, replacedLines[i]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

debugReplacement().catch(console.error);