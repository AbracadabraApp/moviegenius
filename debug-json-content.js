#!/usr/bin/env node
/**
 * Debug the exact JSON content structure
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugJsonContent() {
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
      WHERE m.tmdb_id = 152  -- Star Trek: The Motion Picture
        AND ma.has_links = true
      LIMIT 1
    `);
    
    const analysis = query.rows[0];
    const processedContent = analysis.claude_response.processed_content;
    
    console.log('🔍 Debugging JSON Content Structure');
    console.log('==================================');
    
    // Show first 500 characters with character positions
    console.log('\nFirst 500 characters:');
    const first500 = processedContent.substring(0, 500);
    console.log(first500);
    
    // Show character codes for the problematic area
    console.log('\nCharacter analysis around position 4:');
    for (let i = 0; i < 10; i++) {
      const char = processedContent[i];
      console.log(`Position ${i}: '${char}' (code: ${char.charCodeAt(0)})`);
    }
    
    // Try different fixes
    console.log('\n🔧 Testing different fixes:');
    
    // Fix 1: Just replace &quot; with "
    try {
      const fix1 = processedContent.replace(/&quot;/g, '"');
      JSON.parse(fix1);
      console.log('✅ Fix 1 (&quot; → ") worked');
    } catch (e) {
      console.log('❌ Fix 1 failed:', e.message.substring(0, 80));
    }
    
    // Fix 2: Replace all HTML entities
    try {
      const fix2 = processedContent
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      JSON.parse(fix2);
      console.log('✅ Fix 2 (all HTML entities) worked');
    } catch (e) {
      console.log('❌ Fix 2 failed:', e.message.substring(0, 80));
    }
    
    // Fix 3: Check if it's wrapped in extra quotes
    try {
      const fix3 = processedContent.replace(/^"(.*)"$/, '$1').replace(/&quot;/g, '"');
      JSON.parse(fix3);
      console.log('✅ Fix 3 (remove wrapper quotes + entities) worked');
    } catch (e) {
      console.log('❌ Fix 3 failed:', e.message.substring(0, 80));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

debugJsonContent().catch(console.error);