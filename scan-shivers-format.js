/**
 * Scan database for movies with Shivers-like format issues
 * (analysis content in wrong field format)
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

async function scanShiversFormat() {
  try {
    await client.connect();
    console.log('🔍 Scanning for movies with Shivers-like format issues...\n');
    
    // Query to find analyses like Shivers
    const query = `
      SELECT 
        m.title,
        m.year, 
        m.tmdb_id,
        ma.has_links,
        ma.link_count,
        CASE 
          WHEN ma.claude_response->>'processed_content' IS NOT NULL THEN LENGTH(ma.claude_response->>'processed_content')
          ELSE 0
        END as processed_length,
        CASE 
          WHEN ma.claude_response->>'raw_content' IS NOT NULL THEN LENGTH(ma.claude_response->>'raw_content')
          ELSE 0
        END as raw_length,
        CASE 
          WHEN ma.claude_response->>'analysis' IS NOT NULL THEN LENGTH(ma.claude_response->>'analysis')
          ELSE 0
        END as analysis_length,
        array_to_string(array(select jsonb_object_keys(ma.claude_response)), ', ') as available_fields
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE 
        ma.claude_response IS NOT NULL
        AND (
          -- Has analysis field with substantial content
          (ma.claude_response->>'analysis' IS NOT NULL AND LENGTH(ma.claude_response->>'analysis') > 1000)
          OR
          -- Or has processed_content as JSON string
          (ma.claude_response->>'processed_content' IS NOT NULL AND ma.claude_response->>'processed_content' LIKE '{%')
        )
      ORDER BY analysis_length DESC, processed_length DESC
      LIMIT 20;
    `;
    
    const result = await client.query(query);
    
    console.log('=== MOVIES WITH POTENTIAL FORMAT ISSUES ===');
    console.log('Title (Year) | TMDB | Has Links | Processed | Raw | Analysis | Fields');
    console.log('-------------|------|-----------|-----------|-----|----------|--------');
    
    let shiversLikeCount = 0;
    
    result.rows.forEach(row => {
      const title = `${row.title || 'Unknown'} (${row.year || '????'})`.substring(0, 25).padEnd(25);
      const tmdbId = (row.tmdb_id || 'N/A').toString().padEnd(8);
      const hasLinks = (row.has_links || false).toString().padEnd(10);
      const processed = (row.processed_length || 0).toString().padEnd(10);
      const raw = (row.raw_length || 0).toString().padEnd(6);
      const analysis = (row.analysis_length || 0).toString().padEnd(9);
      const fields = (row.available_fields || '').substring(0, 30);
      
      console.log(`${title} | ${tmdbId} | ${hasLinks} | ${processed} | ${raw} | ${analysis} | ${fields}`);
      
      // Count as Shivers-like if has analysis field but minimal processed/raw content
      if (row.analysis_length > 1000 && row.processed_length < 100 && row.raw_length < 100) {
        shiversLikeCount++;
      }
    });
    
    // Get total counts
    const countQuery = `
      SELECT 
        COUNT(*) as total_analyses,
        SUM(CASE WHEN claude_response->>'analysis' IS NOT NULL AND LENGTH(claude_response->>'analysis') > 1000 THEN 1 ELSE 0 END) as has_analysis_field,
        SUM(CASE WHEN claude_response->>'processed_content' IS NOT NULL AND LENGTH(claude_response->>'processed_content') > 100 THEN 1 ELSE 0 END) as has_processed_content,
        SUM(CASE WHEN claude_response->>'raw_content' IS NOT NULL AND LENGTH(claude_response->>'raw_content') > 100 THEN 1 ELSE 0 END) as has_raw_content,
        SUM(CASE WHEN has_links = true AND link_count > 0 THEN 1 ELSE 0 END) as fully_processed
      FROM movie_analyses 
      WHERE claude_response IS NOT NULL;
    `;
    
    const countResult = await client.query(countQuery);
    const stats = countResult.rows[0];
    
    console.log(`\n📊 DATABASE ANALYSIS SUMMARY:`);
    console.log(`• Total analyses: ${stats.total_analyses}`);
    console.log(`• With analysis field (>1000 chars): ${stats.has_analysis_field}`);  
    console.log(`• With processed_content (>100 chars): ${stats.has_processed_content}`);
    console.log(`• With raw_content (>100 chars): ${stats.has_raw_content}`);
    console.log(`• Fully processed with links: ${stats.fully_processed}`);
    console.log(`• Shivers-like format in sample: ${shiversLikeCount}/20`);
    
    // Estimate total Shivers-like movies
    const shiversQuery = `
      SELECT COUNT(*) as shivers_like_total
      FROM movie_analyses ma
      WHERE 
        ma.claude_response->>'analysis' IS NOT NULL 
        AND LENGTH(ma.claude_response->>'analysis') > 1000
        AND (ma.claude_response->>'processed_content' IS NULL OR LENGTH(ma.claude_response->>'processed_content') < 100)
        AND (ma.claude_response->>'raw_content' IS NULL OR LENGTH(ma.claude_response->>'raw_content') < 100);
    `;
    
    const shiversResult = await client.query(shiversQuery);
    
    console.log(`\n🎬 SHIVERS-LIKE MOVIES NEEDING FORMAT CONVERSION: ${shiversResult.rows[0].shivers_like_total}`);
    console.log(`   These movies have rich analysis content but need our processing script to display properly.`);
    
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
  } finally {
    await client.end();
  }
}

scanShiversFormat();