#!/usr/bin/env node
/**
 * Get raw analysis content to debug JSON parsing
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

async function getRawAnalysis() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get one specific analysis
    const query = `
      SELECT 
        m.tmdb_id,
        m.title,
        ma.claude_response
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = 153
      LIMIT 1
    `;
    
    const result = await client.query(query);
    const row = result.rows[0];
    
    console.log(`MOVIE: ${row.title} (${row.tmdb_id})`);
    console.log('Raw claude_response:');
    console.log(JSON.stringify(row.claude_response, null, 2));
    
    // Try to parse the raw_content
    if (row.claude_response.raw_content) {
      console.log('\n' + '='.repeat(50));
      console.log('Attempting to parse raw_content...');
      
      try {
        const parsed = JSON.parse(row.claude_response.raw_content);
        console.log('✅ JSON parsing successful');
        console.log('whyWatch content:', parsed.whyWatch);
        console.log('linkedReferences content:', parsed.linkedReferences);
        console.log('First content section:', parsed.content?.[0]);
      } catch (e) {
        console.log('❌ JSON parsing failed:', e.message);
        console.log('Raw content sample (first 500 chars):');
        console.log(row.claude_response.raw_content.substring(0, 500));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

getRawAnalysis();