#!/usr/bin/env node

/**
 * Database Query Debug Script
 * Investigates JSON structure in movie_analyses table for Reality Bites (TMDB 2788)
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: false
});

async function debugDatabaseQuery() {
  try {
    console.log('🔍 Starting database investigation...\n');

    // Test connection
    console.log('1. Testing database connection...');
    const testResult = await pool.query('SELECT version()');
    console.log('✅ Connected to:', testResult.rows[0].version.split(' ')[0], '\n');

    // Find Reality Bites record
    console.log('2. Looking for Reality Bites (TMDB 2788)...');
    const realityBitesQuery = `
      SELECT 
        id, 
        tmdb_id, 
        title, 
        analysis_type,
        has_analysis,
        pg_column_size(claude_response) as response_size_bytes,
        jsonb_typeof(claude_response) as response_type
      FROM movie_analyses 
      WHERE tmdb_id = 2788;
    `;
    
    const realityBites = await pool.query(realityBitesQuery);
    
    if (realityBites.rows.length === 0) {
      console.log('❌ Reality Bites (TMDB 2788) not found in movie_analyses table');
      return;
    }
    
    console.log('✅ Found Reality Bites:');
    console.log('   - ID:', realityBites.rows[0].id);
    console.log('   - Title:', realityBites.rows[0].title);
    console.log('   - Analysis Type:', realityBites.rows[0].analysis_type);
    console.log('   - Has Analysis:', realityBites.rows[0].has_analysis);
    console.log('   - Response Size:', realityBites.rows[0].response_size_bytes, 'bytes');
    console.log('   - Response Type:', realityBites.rows[0].response_type);
    console.log('');

    // Examine JSON structure - get top-level keys
    console.log('3. Examining JSON structure - Top level keys...');
    const structureQuery = `
      SELECT jsonb_object_keys(claude_response) as top_level_keys
      FROM movie_analyses 
      WHERE tmdb_id = 2788;
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('✅ Top-level JSON keys:');
    structure.rows.forEach(row => {
      console.log('   -', row.top_level_keys);
    });
    console.log('');

    // Check different potential paths for the content
    console.log('4. Testing different JSON paths for HTML content...');
    
    const pathsToTest = [
      "claude_response->>'processed_content'",
      "claude_response->>'content'",
      "claude_response->>'response'",
      "claude_response->>'analysis'",
      "claude_response->'processed_content'->>'content'",
      "claude_response->'analysis'->>'content'",
      "claude_response->'response'->>'content'"
    ];
    
    for (const path of pathsToTest) {
      try {
        const pathQuery = `
          SELECT 
            '${path}' as json_path,
            ${path} IS NOT NULL as has_content,
            CASE 
              WHEN ${path} IS NOT NULL 
              THEN char_length(${path}::text) 
              ELSE 0 
            END as content_length,
            CASE 
              WHEN ${path} LIKE '%href="/movie/%' 
              THEN true 
              ELSE false 
            END as contains_html_links
          FROM movie_analyses 
          WHERE tmdb_id = 2788;
        `;
        
        const pathResult = await pool.query(pathQuery);
        const result = pathResult.rows[0];
        
        console.log(`   📍 ${result.json_path}:`);
        console.log(`      - Has content: ${result.has_content}`);
        console.log(`      - Content length: ${result.content_length} characters`);
        console.log(`      - Contains HTML links: ${result.contains_html_links}`);
        
        // If this path contains HTML links, show a sample
        if (result.contains_html_links) {
          const sampleQuery = `
            SELECT substring(${path} FROM 'href="/movie/[^"]*"[^>]*>[^<]*</a>') as sample_link
            FROM movie_analyses 
            WHERE tmdb_id = 2788;
          `;
          const sampleResult = await pool.query(sampleQuery);
          console.log(`      - Sample link: ${sampleResult.rows[0].sample_link}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ ${path}: Invalid path (${error.message})`);
        console.log('');
      }
    }

    // Deep dive into the JSON structure
    console.log('5. Deep JSON structure analysis...');
    const deepStructureQuery = `
      SELECT 
        claude_response
      FROM movie_analyses 
      WHERE tmdb_id = 2788;
    `;
    
    const deepResult = await pool.query(deepStructureQuery);
    const jsonData = deepResult.rows[0].claude_response;
    
    console.log('✅ Full JSON structure (first 2000 characters):');
    console.log(JSON.stringify(jsonData, null, 2).substring(0, 2000) + '...\n');

    // Search for any field containing HTML links
    console.log('6. Searching for HTML links in all JSON fields...');
    const searchQuery = `
      WITH RECURSIVE json_tree AS (
        SELECT 
          key as path, 
          value,
          1 as level
        FROM movie_analyses, jsonb_each(claude_response) 
        WHERE tmdb_id = 2788
        
        UNION ALL
        
        SELECT 
          CONCAT(jt.path, '->', je.key) as path,
          je.value,
          jt.level + 1
        FROM json_tree jt, jsonb_each(jt.value) je
        WHERE jsonb_typeof(jt.value) = 'object' AND jt.level < 5
      )
      SELECT 
        path,
        jsonb_typeof(value) as value_type,
        CASE 
          WHEN jsonb_typeof(value) = 'string' AND value::text LIKE '%href="/movie/%'
          THEN true 
          ELSE false 
        END as contains_html_links,
        CASE 
          WHEN jsonb_typeof(value) = 'string' 
          THEN char_length(value::text)
          ELSE 0 
        END as content_length
      FROM json_tree
      WHERE contains_html_links = true OR (jsonb_typeof(value) = 'string' AND char_length(value::text) > 1000)
      ORDER BY contains_html_links DESC, content_length DESC;
    `;
    
    const searchResult = await pool.query(searchQuery);
    
    if (searchResult.rows.length > 0) {
      console.log('✅ Found fields with potential content:');
      searchResult.rows.forEach(row => {
        console.log(`   📍 ${row.path}:`);
        console.log(`      - Type: ${row.value_type}`);
        console.log(`      - Length: ${row.content_length} characters`);
        console.log(`      - Contains HTML links: ${row.contains_html_links}`);
      });
    } else {
      console.log('❌ No HTML links found in any JSON field');
    }
    console.log('');

    // Final verification - count total analyses with HTML links using correct path
    const correctPath = searchResult.rows.find(row => row.contains_html_links)?.path;
    
    if (correctPath) {
      console.log('7. Generating correct SQL query...');
      const countQuery = `
        SELECT COUNT(*) as total_analyses_with_html_links
        FROM movie_analyses
        WHERE claude_response#>>'{${correctPath.split('->').join(',')}}' LIKE '%href="/movie/%';
      `;
      
      console.log('✅ Correct SQL query to count analyses with HTML links:');
      console.log(countQuery);
      console.log('');
      
      const countResult = await pool.query(countQuery);
      console.log('✅ Total analyses with HTML movie links:', countResult.rows[0].total_analyses_with_html_links);
    }

  } catch (error) {
    console.error('❌ Database investigation failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Investigation complete');
  }
}

// Run the investigation
debugDatabaseQuery();