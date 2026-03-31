#!/usr/bin/env node
/**
 * Check the specific 48 Hrs analysis we just processed
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function check48HrsAnalysis() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    
    const query = await client.query(`
      SELECT 
        ma.id,
        ma.claude_response,
        ma.has_links,
        ma.link_count,
        m.title,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = 153  -- Lost in Translation
        AND ma.has_links = true
      LIMIT 1
    `);
    
    if (query.rows.length === 0) {
      console.log('❌ No processed 48 Hrs. analysis found');
      return;
    }
    
    const analysis = query.rows[0];
    console.log(`✅ Found: ${analysis.title} (TMDB: ${analysis.tmdb_id})`);
    console.log('Has links:', analysis.has_links);
    console.log('Link count:', analysis.link_count);
    
    const claudeResponse = analysis.claude_response;
    console.log('\nStructure after batch processing:');
    console.log('- Has raw_content:', !!claudeResponse.raw_content);
    console.log('- Has processed_content:', !!claudeResponse.processed_content);
    console.log('- processed_content type:', typeof claudeResponse.processed_content);
    
    if (claudeResponse.processed_content) {
      console.log('- First 300 chars of processed_content:');
      console.log(claudeResponse.processed_content.substring(0, 300));
      
      // Test if it's valid HTML with links
      const movieLinks = (claudeResponse.processed_content.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
      const contributorLinks = (claudeResponse.processed_content.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
      
      console.log(`\n✅ Links found: ${movieLinks} movies, ${contributorLinks} contributors`);
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    await client.end();
  }
}

check48HrsAnalysis().catch(console.error);