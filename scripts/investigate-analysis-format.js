#!/usr/bin/env node
/**
 * Investigate actual analysis data format in database
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function investigateAnalysisFormat() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to Railway database');

    // Get a few example analyses to understand the data structure
    const query = `
      SELECT 
        m.tmdb_id,
        m.title,
        ma.claude_response,
        ma.analysis_type,
        ma.has_links,
        ma.people_extracted
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id IN (153, 996, 175, 550)
      ORDER BY m.tmdb_id
    `;
    
    const result = await client.query(query);
    
    for (const row of result.rows) {
      console.log('\n' + '='.repeat(50));
      console.log(`MOVIE: ${row.title} (TMDB ID: ${row.tmdb_id})`);
      console.log(`Analysis Type: ${row.analysis_type}`);
      console.log(`Has Links: ${row.has_links}`);
      console.log(`People Extracted: ${row.people_extracted}`);
      
      const claudeResponse = row.claude_response;
      
      if (typeof claudeResponse === 'string') {
        console.log('Format: STRING');
        console.log('Sample:', claudeResponse.substring(0, 200) + '...');
      } else if (claudeResponse && typeof claudeResponse === 'object') {
        console.log('Format: JSON OBJECT');
        console.log('Keys:', Object.keys(claudeResponse));
        
        if (claudeResponse.raw_content) {
          console.log('Has raw_content:', !!claudeResponse.raw_content);
          console.log('Raw content type:', typeof claudeResponse.raw_content);
          
          // Check if raw_content is JSON
          if (typeof claudeResponse.raw_content === 'string') {
            try {
              const parsed = JSON.parse(claudeResponse.raw_content);
              console.log('Raw content is JSON with keys:', Object.keys(parsed));
              
              // Check for specific features
              console.log('- whyWatch:', Array.isArray(parsed.whyWatch) ? `${parsed.whyWatch.length} items` : `type: ${typeof parsed.whyWatch}`, parsed.whyWatch?.slice(0,2));
              if (parsed.featuredMovies) console.log('- Has featuredMovies:', parsed.featuredMovies.length, 'items');
              if (parsed.moreIdeas) console.log('- Has moreIdeas:', parsed.moreIdeas.length, 'items');
              if (parsed.content) console.log('- Has content sections:', parsed.content.length, 'items');
              if (parsed.exploreTopics) console.log('- Has exploreTopics:', parsed.exploreTopics.length, 'items');
              
              // Check has_links flag and linkedReferences
              if (parsed.linkedReferences) {
                console.log('- Has linkedReferences:', Object.keys(parsed.linkedReferences));
              }
              
              // Sample a content section to understand text structure
              if (parsed.content && parsed.content[0]) {
                console.log('- First content section type:', parsed.content[0].type);
                console.log('- First content sample:', parsed.content[0].text?.substring(0, 100) + '...');
              }
            } catch (e) {
              console.log('Raw content is TEXT, sample:', claudeResponse.raw_content.substring(0, 200) + '...');
            }
          }
        }
        
        if (claudeResponse.processed_content) {
          console.log('Has processed_content:', !!claudeResponse.processed_content);
          console.log('Processed content type:', typeof claudeResponse.processed_content);
          console.log('Sample processed content:', claudeResponse.processed_content.substring(0, 200) + '...');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

investigateAnalysisFormat();