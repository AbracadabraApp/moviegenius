#!/usr/bin/env node

import { getPool } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

async function testAPIToRenderFlow() {
  console.log('🔍 Testing API → Render Data Flow');
  console.log('==================================\n');

  const pool = getPool();
  
  try {
    // Test a movie we know was processed (TMDB 2 - Ariel)
    const tmdbId = '2';
    
    console.log(`Testing TMDB ID: ${tmdbId}`);
    console.log('─'.repeat(40));
    
    // Step 1: Check what's actually in the database
    console.log('\n1. DATABASE CONTENT:');
    const dbResult = await pool.query(`
      SELECT 
        ma.claude_response,
        ma.has_links,
        ma.link_count,
        m.title,
        m.year
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
      LIMIT 1
    `, [tmdbId]);

    if (dbResult.rows.length === 0) {
      console.log('❌ No analysis found in database');
      return;
    }

    const analysis = dbResult.rows[0];
    console.log(`   Movie: ${analysis.title} (${analysis.year})`);
    console.log(`   Has links: ${analysis.has_links}`);
    console.log(`   Link count: ${analysis.link_count}`);
    
    // Step 2: Parse the raw content to see the HTML
    let rawContent = analysis.claude_response;
    if (typeof rawContent === 'string') {
      rawContent = JSON.parse(rawContent);
    }
    
    if (rawContent.raw_content) {
      const contentData = JSON.parse(rawContent.raw_content);
      
      console.log('\n2. PARSED CONTENT STRUCTURE:');
      console.log(`   Content sections: ${contentData.content?.length || 0}`);
      
      // Look for HTML links in the first few sections
      if (contentData.content && contentData.content.length > 0) {
        for (let i = 0; i < Math.min(3, contentData.content.length); i++) {
          const section = contentData.content[i];
          if (section.text) {
            const movieLinks = (section.text.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
            const contributorLinks = (section.text.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
            
            console.log(`   Section ${i}: ${movieLinks} movie links, ${contributorLinks} contributor links`);
            
            // Show first HTML link found
            const firstLink = section.text.match(/<a[^>]*href="\/[^"]*"[^>]*>[^<]*<\/a>/);
            if (firstLink) {
              console.log(`   First link: ${firstLink[0]}`);
            }
            
            // Show sample text (first 100 chars)
            console.log(`   Sample text: "${section.text.substring(0, 100)}..."`);
          }
        }
      }
    }
    
    // Step 3: Simulate the API response
    console.log('\n3. API RESPONSE FORMAT:');
    const apiResponse = {
      success: true,
      analysis: rawContent.raw_content,
      rawAnalysis: rawContent.raw_content,
      movie: {
        title: analysis.title,
        year: analysis.year,
        tmdb_id: parseInt(tmdbId)
      },
      cached: true,
      source: 'railway-postgresql'
    };
    
    console.log(`   API returns raw_content type: ${typeof apiResponse.analysis}`);
    console.log(`   API response size: ${JSON.stringify(apiResponse).length} bytes`);
    
    // Step 4: Simulate component processing
    console.log('\n4. COMPONENT PROCESSING SIMULATION:');
    const componentAnalysis = {
      claude_response: {
        raw_content: apiResponse.analysis
      }
    };
    
    try {
      const parsedForComponent = JSON.parse(componentAnalysis.claude_response.raw_content);
      console.log('   ✅ Component can parse JSON');
      console.log(`   JSON has content array: ${!!parsedForComponent.content}`);
      console.log(`   Content sections: ${parsedForComponent.content?.length || 0}`);
      
      // Test if component would find HTML links
      if (parsedForComponent.content) {
        let totalHtmlLinks = 0;
        for (const section of parsedForComponent.content) {
          if (section.text) {
            const links = (section.text.match(/<a[^>]*href="\/[^"]*"[^>]*>/g) || []).length;
            totalHtmlLinks += links;
          }
        }
        console.log(`   Total HTML links component would find: ${totalHtmlLinks}`);
      }
      
    } catch (parseError) {
      console.log('   ❌ Component cannot parse JSON:', parseError.message);
    }
    
    console.log('\n5. RENDERING EXPECTATION:');
    console.log('   If MovieAnalysisWithEntities detects JSON format,');
    console.log('   it should render each section.text with dangerouslySetInnerHTML');
    console.log('   which would convert HTML strings to actual clickable links.');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
  
  process.exit(0);
}

testAPIToRenderFlow();