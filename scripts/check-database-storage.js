#!/usr/bin/env node

/**
 * Check Database Storage
 * 
 * Verify what's actually being stored in the database after batch processing
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  return new Client({ connectionString: dbUrl });
}

async function checkStorage() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('🔍 Checking database storage after batch processing...\n');
    
    // Get some movies that were recently processed
    const recentResult = await client.query(`
      SELECT ma.movie_id, ma.updated_at, m.tmdb_id, m.title, m.year
      FROM movie_analyses ma
      JOIN movies m ON m.id = ma.movie_id
      WHERE ma.updated_at > NOW() - INTERVAL '10 minutes'
      ORDER BY ma.updated_at DESC
      LIMIT 5
    `);
    
    if (recentResult.rows.length === 0) {
      console.log('⚠️  No recently updated analyses found. Getting sample analyses...');
      
      // Get some sample analyses instead
      const sampleResult = await client.query(`
        SELECT ma.movie_id, m.tmdb_id, m.title, m.year, ma.updated_at
        FROM movie_analyses ma
        JOIN movies m ON m.id = ma.movie_id
        WHERE ma.claude_response::text LIKE '%plotAndCharacters%'
        ORDER BY ma.updated_at DESC
        LIMIT 5
      `);
      
      if (sampleResult.rows.length === 0) {
        console.log('❌ No analyses found with structured content');
        return;
      }
      
      console.log('📋 Found sample analyses:');
      sampleResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title} (${row.year}) - TMDB: ${row.tmdb_id}`);
      });
      
      // Check the actual stored content
      await checkAnalysisContent(client, sampleResult.rows[0].tmdb_id, sampleResult.rows[0].title);
      
    } else {
      console.log('📋 Recently processed analyses:');
      recentResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title} (${row.year}) - TMDB: ${row.tmdb_id} (${row.updated_at})`);
      });
      
      // Check the actual stored content for the most recent one
      await checkAnalysisContent(client, recentResult.rows[0].tmdb_id, recentResult.rows[0].title);
    }
    
  } catch (error) {
    console.error('❌ Storage check failed:', error);
  } finally {
    await client.end();
  }
}

async function checkAnalysisContent(client, tmdbId, title) {
  console.log(`\n🔍 Examining stored content for: ${title} (${tmdbId})\n`);
  
  // Get the analysis data
  const analysisResult = await client.query(`
    SELECT ma.claude_response
    FROM movie_analyses ma
    JOIN movies m ON m.id = ma.movie_id
    WHERE m.tmdb_id = $1
  `, [tmdbId]);
  
  if (analysisResult.rows.length === 0) {
    console.log('❌ No analysis found for this movie');
    return;
  }
  
  const analysis = analysisResult.rows[0].claude_response;
  
  // Parse and examine the structure
  if (typeof analysis === 'string') {
    try {
      const parsed = JSON.parse(analysis);
      console.log('📄 Analysis structure:');
      console.log(`   Type: ${typeof parsed}`);
      console.log(`   Keys: ${Object.keys(parsed).join(', ')}`);
      
      // Check structured_content specifically
      if (parsed.structured_content) {
        console.log('\n📋 structured_content found:');
        console.log(`   Type: ${typeof parsed.structured_content}`);
        
        if (typeof parsed.structured_content === 'object') {
          console.log(`   Keys: ${Object.keys(parsed.structured_content).join(', ')}`);
          
          // Check content array
          if (parsed.structured_content.content && Array.isArray(parsed.structured_content.content)) {
            console.log(`   Content sections: ${parsed.structured_content.content.length}`);
            
            // Show first section with links
            const firstSection = parsed.structured_content.content.find(section => 
              section.text && section.text.includes('<a href')
            );
            
            if (firstSection) {
              console.log('\n🔗 Sample section with links:');
              console.log(`   Type: ${firstSection.type}`);
              console.log(`   Text sample: ${firstSection.text.substring(0, 200)}...`);
              
              // Count links in this section
              const movieLinks = (firstSection.text.match(/<a href="\/movie\/\d+"/g) || []).length;
              const personLinks = (firstSection.text.match(/<a href="\/person\/\d+"/g) || []).length;
              console.log(`   Movie links: ${movieLinks}, Person links: ${personLinks}`);
            }
          }
          
          // Check whyWatch
          if (parsed.structured_content.whyWatch) {
            console.log('\n💡 whyWatch section:');
            const whyWatch = parsed.structured_content.whyWatch;
            if (typeof whyWatch === 'object' && whyWatch.text) {
              const movieLinks = (whyWatch.text.match(/<a href="\/movie\/\d+"/g) || []).length;
              const personLinks = (whyWatch.text.match(/<a href="\/person\/\d+"/g) || []).length;
              console.log(`   Movie links: ${movieLinks}, Person links: ${personLinks}`);
              console.log(`   Text sample: ${whyWatch.text.substring(0, 150)}...`);
            }
          }
          
          // Check moreIdeas
          if (parsed.structured_content.moreIdeas && Array.isArray(parsed.structured_content.moreIdeas)) {
            console.log('\n💭 moreIdeas sections:');
            parsed.structured_content.moreIdeas.forEach((idea, index) => {
              if (idea.text) {
                const movieLinks = (idea.text.match(/<a href="\/movie\/\d+"/g) || []).length;
                const personLinks = (idea.text.match(/<a href="\/person\/\d+"/g) || []).length;
                console.log(`   Section ${index + 1}: ${movieLinks} movie links, ${personLinks} person links`);
              }
            });
          }
        }
      } else {
        console.log('⚠️  No structured_content found in analysis');
      }
      
    } catch (parseError) {
      console.log('❌ Failed to parse analysis JSON:', parseError.message);
    }
  } else if (typeof analysis === 'object') {
    console.log('📄 Analysis is already an object');
    console.log(`   Keys: ${Object.keys(analysis).join(', ')}`);
    
    // Check processed_content for links
    if (analysis.processed_content) {
      console.log('\n📋 processed_content found:');
      console.log(`   Type: ${typeof analysis.processed_content}`);
      
      let processedContent = analysis.processed_content;
      if (typeof analysis.processed_content === 'string') {
        try {
          processedContent = JSON.parse(analysis.processed_content);
          console.log('   ✅ Parsed JSON string successfully');
        } catch (e) {
          console.log('   ❌ Failed to parse processed_content as JSON');
          return;
        }
      }
      
      if (typeof processedContent === 'object') {
        console.log(`   Keys: ${Object.keys(processedContent).join(', ')}`);
        
        // Check content array
        if (processedContent.content && Array.isArray(processedContent.content)) {
          console.log(`   Content sections: ${processedContent.content.length}`);
          
          // Show first section with links
          const firstSection = processedContent.content.find(section => 
            section.text && section.text.includes('<a href')
          );
          
          if (firstSection) {
            console.log('\n🔗 Sample section with links:');
            console.log(`   Type: ${firstSection.type}`);
            console.log(`   Text sample: ${firstSection.text.substring(0, 300)}...`);
            
            // Count links in this section
            const movieLinks = (firstSection.text.match(/<a href="\/movie\/\d+"/g) || []).length;
            const personLinks = (firstSection.text.match(/<a href="\/person\/\d+"/g) || []).length;
            console.log(`   Movie links: ${movieLinks}, Person links: ${personLinks}`);
          } else {
            console.log('\n📝 First section (no links):');
            const firstSection = processedContent.content[0];
            if (firstSection && firstSection.text) {
              console.log(`   Type: ${firstSection.type}`);
              console.log(`   Text sample: ${firstSection.text.substring(0, 300)}...`);
            }
          }
        }
        
        // Check whyWatch
        if (processedContent.whyWatch) {
          console.log('\n💡 whyWatch section:');
          const whyWatch = processedContent.whyWatch;
          if (typeof whyWatch === 'object' && whyWatch.text) {
            const movieLinks = (whyWatch.text.match(/<a href="\/movie\/\d+"/g) || []).length;
            const personLinks = (whyWatch.text.match(/<a href="\/person\/\d+"/g) || []).length;
            console.log(`   Movie links: ${movieLinks}, Person links: ${personLinks}`);
            console.log(`   Text sample: ${whyWatch.text.substring(0, 200)}...`);
          }
        }
        
        // Check moreIdeas
        if (processedContent.moreIdeas && Array.isArray(processedContent.moreIdeas)) {
          console.log('\n💭 moreIdeas sections:');
          let totalMovieLinks = 0;
          let totalPersonLinks = 0;
          
          processedContent.moreIdeas.forEach((idea, index) => {
            if (idea.text) {
              const movieLinks = (idea.text.match(/<a href="\/movie\/\d+"/g) || []).length;
              const personLinks = (idea.text.match(/<a href="\/person\/\d+"/g) || []).length;
              totalMovieLinks += movieLinks;
              totalPersonLinks += personLinks;
              console.log(`   Section ${index + 1}: ${movieLinks} movie links, ${personLinks} person links`);
            }
          });
          
          console.log(`   TOTAL: ${totalMovieLinks} movie links, ${totalPersonLinks} person links`);
        }
      }
    } else {
      console.log('⚠️  No processed_content found in analysis');
    }
  }
}

checkStorage().catch(console.error);