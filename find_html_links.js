#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: false
});

async function findHtmlLinks() {
  try {
    console.log('🔍 Looking for analyses with HTML links...\n');

    // Find analyses that have links
    console.log('1. Finding analyses with has_links = true:');
    const linkedAnalysesQuery = `
      SELECT 
        ma.id as analysis_id,
        m.title,
        m.tmdb_id,
        ma.has_links,
        ma.link_count,
        ma.analysis_type,
        jsonb_object_keys(ma.claude_response) as top_keys
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.has_links = true
      LIMIT 5;
    `;
    
    const linkedResult = await pool.query(linkedAnalysesQuery);
    
    if (linkedResult.rows.length === 0) {
      console.log('❌ No analyses with has_links = true found');
      return;
    }
    
    console.log('✅ Found analyses with links:');
    const groupedResults = {};
    linkedResult.rows.forEach(row => {
      if (!groupedResults[row.analysis_id]) {
        groupedResults[row.analysis_id] = {
          title: row.title,
          tmdb_id: row.tmdb_id,
          has_links: row.has_links,
          link_count: row.link_count,
          analysis_type: row.analysis_type,
          keys: []
        };
      }
      groupedResults[row.analysis_id].keys.push(row.top_keys);
    });

    Object.entries(groupedResults).forEach(([id, data]) => {
      console.log(`   - ${data.title} (TMDB ${data.tmdb_id}): ${data.link_count} links`);
    });
    console.log('');

    // Get a specific analysis with links for deep inspection
    const firstAnalysisId = Object.keys(groupedResults)[0];
    const firstAnalysis = groupedResults[firstAnalysisId];
    
    console.log(`2. Deep inspection of "${firstAnalysis.title}" analysis:`);
    
    // Check different fields for HTML content
    const pathsToTest = [
      { name: 'processed_content', path: "claude_response->>'processed_content'" },
      { name: 'raw_content', path: "claude_response->>'raw_content'" }
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
            END as contains_html_links,
            CASE 
              WHEN ${path} LIKE '%href="/movie/%'
              THEN (length(${path}) - length(replace(${path}, 'href="/movie/', ''))) / length('href="/movie/')
              ELSE 0
            END as estimated_link_count
          FROM movie_analyses 
          WHERE id = $1;
        `;
        
        const checkResult = await pool.query(checkQuery, [firstAnalysisId]);
        const result = checkResult.rows[0];
        
        console.log(`   📍 ${result.field_name}:`);
        console.log(`      - Has content: ${result.has_content}`);
        console.log(`      - Content length: ${result.content_length} characters`);
        console.log(`      - Contains HTML links: ${result.contains_html_links}`);
        console.log(`      - Estimated link count: ${result.estimated_link_count}`);
        
        // If this field contains HTML links, show samples
        if (result.contains_html_links) {
          console.log('      🎯 FOUND HTML LINKS! Getting samples...');
          
          const sampleQuery = `
            SELECT 
              regexp_split_to_array(${path}, 'href="/movie/') as link_parts
            FROM movie_analyses 
            WHERE id = $1;
          `;
          
          const sampleResult = await pool.query(sampleQuery, [firstAnalysisId]);
          const linkParts = sampleResult.rows[0].link_parts;
          
          console.log(`      - Sample links found:`);
          // Extract actual links from the parts
          for (let i = 1; i < Math.min(linkParts.length, 4); i++) { // Show first 3 links
            const linkPart = linkParts[i];
            const match = linkPart.match(/^(\d+)"[^>]*>([^<]+)<\/a>/);
            if (match) {
              console.log(`        * TMDB ID: ${match[1]}, Title: ${match[2]}`);
            }
          }
        }
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ ${name}: Error checking path (${error.message})`);
        console.log('');
      }
    }

    // Get the exact content to see structure
    console.log('3. Getting sample content with HTML links:');
    const contentQuery = `
      SELECT 
        claude_response->>'processed_content' as processed_content
      FROM movie_analyses 
      WHERE id = $1;
    `;
    
    const contentResult = await pool.query(contentQuery, [firstAnalysisId]);
    const content = contentResult.rows[0].processed_content;
    
    // Find and display the HTML links
    const htmlLinkRegex = /<a href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g;
    const links = content.match(htmlLinkRegex);
    
    if (links) {
      console.log('✅ HTML Links found in processed_content:');
      links.slice(0, 5).forEach((link, index) => {
        console.log(`   ${index + 1}. ${link}`);
      });
      console.log(`   ... and ${Math.max(0, links.length - 5)} more links`);
    } else {
      console.log('❌ No HTML links found in processed_content');
    }
    console.log('');

    // Now generate the correct SQL query
    console.log('4. Generating correct SQL queries:');
    
    console.log('✅ Query to count all analyses with HTML movie links:');
    const countQuery = `
SELECT COUNT(*) as total_analyses_with_html_links
FROM movie_analyses
WHERE claude_response->>'processed_content' LIKE '%href="/movie/%';`;
    console.log(countQuery);
    console.log('');
    
    // Execute the count query
    const countResult = await pool.query(countQuery);
    console.log('📊 Result:', countResult.rows[0].total_analyses_with_html_links, 'analyses contain HTML movie links');
    console.log('');

    // Alternative queries for different scenarios
    console.log('✅ Alternative queries:');
    
    console.log('Query to count analyses with HTML links (any field):');
    const altQuery1 = `
SELECT COUNT(*) as total
FROM movie_analyses
WHERE claude_response->>'processed_content' LIKE '%href="/movie/%'
   OR claude_response->>'raw_content' LIKE '%href="/movie/%';`;
    console.log(altQuery1);
    
    const altResult1 = await pool.query(altQuery1);
    console.log('📊 Result:', altResult1.rows[0].total, 'analyses contain HTML movie links in any field');
    console.log('');

    console.log('Query to find specific movie references (e.g., Garden State - TMDB 401):');
    const specificQuery = `
SELECT 
    m.title,
    m.tmdb_id,
    ma.claude_response->>'processed_content' LIKE '%data-tmdb-id="401"%' as mentions_garden_state
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE claude_response->>'processed_content' LIKE '%data-tmdb-id="401"%';`;
    console.log(specificQuery);
    
    const specificResult = await pool.query(specificQuery);
    if (specificResult.rows.length > 0) {
      console.log('📊 Movies that reference Garden State:');
      specificResult.rows.forEach(row => {
        console.log(`   - ${row.title} (TMDB ${row.tmdb_id})`);
      });
    } else {
      console.log('📊 No movies found that reference Garden State (TMDB 401)');
    }
    console.log('');

    // Test Reality Bites one more time with correct query
    console.log('5. Final check on Reality Bites:');
    const realityCheck = `
      SELECT 
        m.title,
        ma.has_links,
        ma.link_count,
        ma.claude_response->>'processed_content' LIKE '%href="/movie/%' as has_html_links,
        char_length(ma.claude_response->>'processed_content') as content_length
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = 2788;
    `;
    
    const realityResult = await pool.query(realityCheck);
    if (realityResult.rows.length > 0) {
      const reality = realityResult.rows[0];
      console.log('✅ Reality Bites status:');
      console.log(`   - Title: ${reality.title}`);
      console.log(`   - Has links flag: ${reality.has_links}`);
      console.log(`   - Link count: ${reality.link_count}`);
      console.log(`   - Actually has HTML links: ${reality.has_html_links}`);
      console.log(`   - Content length: ${reality.content_length} characters`);
      
      if (!reality.has_html_links) {
        console.log('   ❌ Reality Bites does NOT contain HTML links in processed_content');
        console.log('   💡 The database flags suggest links were not processed for this analysis');
      }
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Investigation complete');
  }
}

findHtmlLinks();