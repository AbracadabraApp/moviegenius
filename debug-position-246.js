#!/usr/bin/env node
/**
 * Debug position 246 specifically
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugPosition246() {
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
    
    console.log('🔍 Debugging Position 246');
    console.log('=========================');
    
    // Show characters around position 246
    const start = Math.max(0, 246 - 20);
    const end = Math.min(processedContent.length, 246 + 20);
    
    console.log(`Characters from ${start} to ${end}:`);
    for (let i = start; i < end; i++) {
      const char = processedContent[i];
      const marker = i === 246 ? ' ←ERROR' : '';
      console.log(`${i}: '${char}' (${char.charCodeAt(0)})${marker}`);
    }
    
    console.log('\nContext around position 246:');
    console.log(processedContent.substring(start, end));
    
    // Show lines around position 246
    const lines = processedContent.split('\n');
    let currentPos = 0;
    let lineNum = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineStart = currentPos;
      const lineEnd = currentPos + lines[i].length + 1; // +1 for newline
      
      if (lineStart <= 246 && 246 < lineEnd) {
        console.log(`\n📍 Error is on line ${i + 1}:`);
        console.log(`Line: "${lines[i]}"`);
        console.log(`Position in line: ${246 - lineStart}`);
        break;
      }
      
      currentPos = lineEnd;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

debugPosition246().catch(console.error);