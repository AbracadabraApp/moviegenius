#!/usr/bin/env node

import { getPool } from './lib/railway-db.js';
import { processAnalysisContent } from './lib/movie-analysis-linker.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

async function testDirectHTMLLinking() {
  console.log('🧪 Testing Direct HTML Linking Approach');
  console.log('=====================================\n');

  const pool = getPool();
  
  try {
    // Get 10 test analyses
    const result = await pool.query(`
      SELECT 
        ma.id,
        ma.claude_response,
        m.title,
        m.year,
        m.tmdb_id,
        m.contributors_json
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
      ORDER BY m.tmdb_id ASC
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} analyses to test\n`);

    for (let i = 0; i < result.rows.length; i++) {
      const analysis = result.rows[i];
      const movieTitle = `${analysis.title} (${analysis.year})`;
      
      console.log(`\n[${i + 1}/10] Testing: ${movieTitle} - TMDB: ${analysis.tmdb_id}`);
      console.log('─'.repeat(60));

      try {
        // Parse the analysis content
        let analysisData = analysis.claude_response;
        if (typeof analysisData === 'string') {
          analysisData = JSON.parse(analysisData);
        }

        // Extract raw content
        let rawContent = '';
        if (analysisData.raw_content && typeof analysisData.raw_content === 'string') {
          try {
            const parsed = JSON.parse(analysisData.raw_content);
            if (parsed.content && Array.isArray(parsed.content)) {
              // Get first text content section for testing
              const firstTextSection = parsed.content.find(section => section.text && section.text.trim());
              if (firstTextSection) {
                rawContent = firstTextSection.text.substring(0, 500); // First 500 chars for testing
              }
            }
          } catch (e) {
            rawContent = analysisData.raw_content.substring(0, 500);
          }
        }

        if (!rawContent || rawContent.trim().length === 0) {
          console.log('   ⚠️ No content found to process');
          continue;
        }

        console.log('📝 Original content:');
        console.log('   ' + rawContent.replace(/\n/g, '\n   '));

        // Create contributors string if available
        let contributorsString = '';
        if (analysis.contributors_json) {
          const contributors = analysis.contributors_json;
          const parts = [];
          
          Object.keys(contributors).forEach(role => {
            if (contributors[role] && Array.isArray(contributors[role])) {
              const names = contributors[role].map(c => c.name || c).join(', ');
              const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
              parts.push(`${roleCapitalized}: ${names}`);
            }
          });
          
          if (parts.length > 0) {
            contributorsString = `KEY_CONTRIBUTORS: ${parts.join(', ')}`;
          }
        }

        // Test the linking process
        const processedContent = await processAnalysisContent(
          rawContent,
          analysis.title, // Current movie title for self-reference prevention
          `test-${analysis.tmdb_id}`,
          contributorsString,
          {
            processMovies: true,
            processContributors: true,
            dbClient: pool
          }
        );

        console.log('\n🔗 Processed content:');
        console.log('   ' + processedContent.replace(/\n/g, '\n   '));

        // Count the links created
        const movieLinks = (processedContent.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
        const contributorLinks = (processedContent.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
        
        console.log(`\n📊 Results: ${movieLinks} movie links, ${contributorLinks} contributor links`);

      } catch (error) {
        console.error(`   ❌ Error processing: ${error.message}`);
      }
    }

    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
  
  process.exit(0);
}

testDirectHTMLLinking();