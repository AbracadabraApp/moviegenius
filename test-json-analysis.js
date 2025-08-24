#!/usr/bin/env node
/**
 * Test the batch script specifically on a JSON-structured analysis
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testJsonAnalysis() {
  console.log('🔍 Testing JSON Analysis Processing');
  console.log('==================================');

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    
    // Find a JSON-structured analysis that needs links
    const query = await client.query(`
      SELECT 
        ma.id,
        ma.movie_id, 
        ma.claude_response,
        ma.has_links,
        ma.link_count,
        m.title,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        AND (ma.has_links = false OR ma.has_links IS NULL)
        AND m.tmdb_id IN (599) -- Sunset Boulevard
      LIMIT 1
    `);
    
    if (query.rows.length === 0) {
      console.log('❌ No suitable JSON analysis found');
      return;
    }
    
    const analysis = query.rows[0];
    console.log(`Found: ${analysis.title} (TMDB: ${analysis.tmdb_id})`);
    
    const rawContent = analysis.claude_response.raw_content;
    console.log('\nAnalysis Structure:');
    console.log('- Type:', typeof rawContent);
    console.log('- Is Object:', typeof rawContent === 'object');
    console.log('- Has content array:', !!(rawContent && rawContent.content && Array.isArray(rawContent.content)));
    
    if (rawContent && rawContent.content) {
      console.log('\nContent Sections:');
      rawContent.content.forEach((section, index) => {
        console.log(`Section ${index}:`, {
          type: section.type,
          textLength: section.text?.length,
          hasMoviePatterns: section.text?.includes('**'),
          moviePatternCount: (section.text?.match(/\*\*[^*]+\*\*/g) || []).length
        });
      });
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    await client.end();
  }
}

testJsonAnalysis().catch(console.error);