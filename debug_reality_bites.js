#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: false
});

async function debugRealityBites() {
  try {
    console.log('🔍 Looking for Reality Bites (TMDB 2788)...\n');

    // First, find Reality Bites in the movies table
    console.log('1. Searching movies table for TMDB 2788:');
    const moviesQuery = `
      SELECT id, title, tmdb_id, year, slug
      FROM movies 
      WHERE tmdb_id = 2788;
    `;
    
    const movieResult = await pool.query(moviesQuery);
    
    if (movieResult.rows.length === 0) {
      console.log('❌ Reality Bites not found in movies table');
      return;
    }
    
    const movie = movieResult.rows[0];
    console.log('✅ Found Reality Bites:');
    console.log('   - Movie ID:', movie.id);
    console.log('   - Title:', movie.title);
    console.log('   - TMDB ID:', movie.tmdb_id);
    console.log('   - Year:', movie.year);
    console.log('   - Slug:', movie.slug);
    console.log('');

    // Now find analysis for this movie
    console.log('2. Searching for analysis using movie_id:');
    const analysisQuery = `
      SELECT 
        id, 
        query_text, 
        analysis_type,
        has_links,
        link_count,
        pg_column_size(claude_response) as response_size_bytes,
        jsonb_typeof(claude_response) as response_type,
        jsonb_object_keys(claude_response) as top_level_keys
      FROM movie_analyses 
      WHERE movie_id = $1;
    `;
    
    const analysisResult = await pool.query(analysisQuery, [movie.id]);
    
    if (analysisResult.rows.length === 0) {
      console.log('❌ No analysis found for Reality Bites');
      return;
    }
    
    console.log('✅ Found analysis:');
    const analysis = analysisResult.rows[0];
    console.log('   - Analysis ID:', analysis.id);
    console.log('   - Query text:', analysis.query_text.substring(0, 100) + '...');
    console.log('   - Analysis type:', analysis.analysis_type);
    console.log('   - Has links:', analysis.has_links);
    console.log('   - Link count:', analysis.link_count);
    console.log('   - Response size:', analysis.response_size_bytes, 'bytes');
    console.log('   - Response type:', analysis.response_type);
    console.log('');

    // Get all top-level keys
    console.log('3. Examining JSON structure:');
    const keysQuery = `
      SELECT DISTINCT jsonb_object_keys(claude_response) as keys
      FROM movie_analyses 
      WHERE movie_id = $1
      ORDER BY keys;
    `;
    
    const keysResult = await pool.query(keysQuery, [movie.id]);
    console.log('✅ Top-level JSON keys:');
    keysResult.rows.forEach(row => {
      console.log('   -', row.keys);
    });
    console.log('');

    // Check for HTML content in different fields
    console.log('4. Checking for HTML links in different JSON paths:');
    const pathsToTest = [
      { name: 'processed_content', path: "claude_response->>'processed_content'" },
      { name: 'raw_content', path: "claude_response->>'raw_content'" },
      { name: 'content', path: "claude_response->>'content'" },
      { name: 'analysis', path: "claude_response->>'analysis'" }
    ];
    
    for (const { name, path } of pathsToTest) {
      try {
        const checkQuery = `
          SELECT 
            '${name}' as field_name,
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
          WHERE movie_id = $1;
        `;
        
        const checkResult = await pool.query(checkQuery, [movie.id]);
        const result = checkResult.rows[0];
        
        console.log(`   📍 ${result.field_name}:`);
        console.log(`      - Has content: ${result.has_content}`);
        console.log(`      - Content length: ${result.content_length} characters`);
        console.log(`      - Contains HTML links: ${result.contains_html_links}`);
        
        // If this field contains HTML links, show sample
        if (result.contains_html_links) {
          console.log('      🎯 FOUND HTML LINKS! Getting sample...');
          
          const sampleQuery = `
            SELECT 
              substring(${path} FROM 'href="/movie/[^"]*"[^>]*>[^<]*</a>') as sample_link,
              (length(${path}) - length(replace(${path}, 'href="/movie/', ''))) / length('href="/movie/') as link_count
            FROM movie_analyses 
            WHERE movie_id = $1;
          `;
          
          const sampleResult = await pool.query(sampleQuery, [movie.id]);
          console.log(`      - Sample HTML link: ${sampleResult.rows[0].sample_link}`);
          console.log(`      - Estimated link count: ${sampleResult.rows[0].link_count}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ ${name}: Error checking path (${error.message})`);
        console.log('');
      }
    }

    // Get full JSON structure (truncated for readability)
    console.log('5. Sample of JSON structure:');
    const fullQuery = `
      SELECT claude_response
      FROM movie_analyses 
      WHERE movie_id = $1;
    `;
    
    const fullResult = await pool.query(fullQuery, [movie.id]);
    const jsonData = fullResult.rows[0].claude_response;
    
    // Show structure summary
    console.log('✅ JSON structure overview:');
    for (const [key, value] of Object.entries(jsonData)) {
      if (typeof value === 'string') {
        console.log(`   - ${key}: string (${value.length} chars)`);
        if (value.includes('href="/movie/')) {
          console.log(`     🎯 CONTAINS HTML LINKS!`);
        }
      } else if (typeof value === 'object' && value !== null) {
        console.log(`   - ${key}: object (${Object.keys(value).length} properties)`);
      } else {
        console.log(`   - ${key}: ${typeof value}`);
      }
    }
    console.log('');

    // Generate correct SQL query
    console.log('6. Generating correct SQL query for counting analyses with HTML links:');
    
    // Find the field that contains HTML links
    let correctField = null;
    for (const [key, value] of Object.entries(jsonData)) {
      if (typeof value === 'string' && value.includes('href="/movie/')) {
        correctField = key;
        break;
      }
    }
    
    if (correctField) {
      const countQuery = `
        SELECT COUNT(*) as total_analyses_with_html_links
        FROM movie_analyses
        WHERE claude_response->>'${correctField}' LIKE '%href="/movie/%';
      `;
      
      console.log('✅ Correct SQL query:');
      console.log(countQuery);
      console.log('');
      
      const countResult = await pool.query(countQuery);
      console.log('✅ Total analyses with HTML movie links:', countResult.rows[0].total_analyses_with_html_links);
    } else {
      console.log('❌ Could not find field with HTML links');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Investigation complete');
  }
}

debugRealityBites();