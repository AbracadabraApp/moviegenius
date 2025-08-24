#!/usr/bin/env node
/**
 * Test parsing with actual database content from TMDB 152
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testActualParsing() {
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
    
    if (query.rows.length === 0) {
      console.log('❌ No processed analysis found');
      return;
    }
    
    const analysis = query.rows[0];
    const processedContent = analysis.claude_response.processed_content;
    
    console.log('🔍 Testing Component Parsing with Actual Database Content');
    console.log('=========================================================');
    console.log('\nProcessed content first 300 chars:');
    console.log(processedContent.substring(0, 300));
    
    // Test original parsing (should fail)
    try {
      const directParsed = JSON.parse(processedContent);
      console.log('❌ UNEXPECTED: Direct parsing succeeded');
      console.log('This means the batch script fix worked differently than expected');
    } catch (e) {
      console.log('✅ Step 1: Direct parsing failed as expected');
      console.log('Error:', e.message.substring(0, 100) + '...');
      
      // Test my component fix
      try {
        const cleanedContent = processedContent.replace(/&quot;/g, '"');
        const parsed = JSON.parse(cleanedContent);
        console.log('✅ Step 2: Parsing succeeded after HTML entity fix');
        
        // Check structure
        console.log('\n📊 Parsed Structure:');
        console.log('- Type:', typeof parsed);
        console.log('- Has content array:', !!parsed.content);
        console.log('- Content length:', parsed.content?.length || 0);
        
        if (parsed.content && parsed.content.length > 0) {
          console.log('- First section type:', parsed.content[0].type);
          console.log('- First section has text:', !!parsed.content[0].text);
          
          // Check for movie links in first section
          const firstText = parsed.content[0].text || '';
          const movieLinks = (firstText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
          console.log('- Movie links in first section:', movieLinks);
          
          if (movieLinks > 0) {
            console.log('\n✅ SUCCESS: Component should now display HTML links instead of markdown');
          }
        }
        
      } catch (e2) {
        console.log('❌ HTML entity fix failed:', e2.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

testActualParsing().catch(console.error);