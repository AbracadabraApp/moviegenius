// Debug script for movie 805 HTML links issue
import { Client } from 'pg';
import dotenv from 'dotenv';

async function debugMovie805() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔍 Debugging Movie 805 HTML Links Issue');
    
    // First check table structure
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'movies' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const schemaResult = await client.query(schemaQuery);
    console.log('\n📊 Movies table schema:');
    schemaResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

    // Query the movie analysis data using correct column names
    const query = `
      SELECT *
      FROM movies 
      WHERE tmdb_id = 805
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Movie 805 not found in database');
      return;
    }
    
    const movie = result.rows[0];
    console.log('\n📽️ Movie Info:');
    console.log(`Title: ${movie.title} (${movie.year})`);
    console.log(`Has Analysis: ${movie.has_analysis}`);
    console.log(`Has Linked Analysis: ${movie.has_linked_analysis}`);
    console.log(`Created: ${movie.created_at}`);
    
    // Check if there's a separate analyses table
    console.log('\n🔍 Checking for separate analyses table...');
    try {
      const analysisQuery = `
        SELECT * FROM analyses WHERE tmdb_id = 805 LIMIT 1
      `;
      const analysisResult = await client.query(analysisQuery);
      
      if (analysisResult.rows.length > 0) {
        const analysis = analysisResult.rows[0];
        console.log('✅ Found analysis in analyses table');
        console.log('Analysis columns:', Object.keys(analysis));
        
        // Check for claude_response in analysis
        if (analysis.claude_response) {
          console.log('\n🔍 Analysis Claude Response found');
          let claudeResponse;
          try {
            claudeResponse = typeof analysis.claude_response === 'string' 
              ? JSON.parse(analysis.claude_response) 
              : analysis.claude_response;
            console.log('Response keys:', Object.keys(claudeResponse));
            
            // Check for HTML links
            if (claudeResponse.processed_content) {
              const linkMatches = claudeResponse.processed_content.match(/<a href="[^"]*"[^>]*>[^<]+<\/a>/g);
              console.log(`🔗 Found ${linkMatches ? linkMatches.length : 0} HTML links`);
              if (linkMatches) {
                linkMatches.slice(0, 3).forEach((link, i) => {
                  console.log(`  ${i + 1}. ${link}`);
                });
              }
            }
          } catch (e) {
            console.log('❌ Failed to parse claude_response:', e.message);
          }
        }
      } else {
        console.log('❌ No analysis found in analyses table');
      }
    } catch (e) {
      console.log('❌ Analyses table may not exist:', e.message);
    }
    
    return;
    
    console.log('\n🔍 Claude Response Analysis:');
    
    let claudeResponse;
    try {
      claudeResponse = typeof movie.claude_response === 'string' 
        ? JSON.parse(movie.claude_response) 
        : movie.claude_response;
    } catch (e) {
      console.log('❌ Failed to parse claude_response as JSON:', e.message);
      console.log('Raw content type:', typeof movie.claude_response);
      console.log('Raw content preview:', movie.claude_response.substring(0, 200));
      return;
    }
    
    console.log('Response type:', typeof claudeResponse);
    console.log('Response keys:', Object.keys(claudeResponse));
    
    // Check for processed_content (HTML links)
    if (claudeResponse.processed_content) {
      console.log('\n✅ Found processed_content (HTML links)');
      console.log('Length:', claudeResponse.processed_content.length);
      
      // Look for HTML link patterns
      const linkMatches = claudeResponse.processed_content.match(/<a href="[^"]*"[^>]*>[^<]+<\/a>/g);
      if (linkMatches) {
        console.log(`🔗 Found ${linkMatches.length} HTML links:`);
        linkMatches.slice(0, 5).forEach((link, i) => {
          console.log(`  ${i + 1}. ${link}`);
        });
        if (linkMatches.length > 5) {
          console.log(`  ... and ${linkMatches.length - 5} more`);
        }
      } else {
        console.log('❌ No HTML links found in processed_content');
      }
      
      // Show first 500 characters of processed content
      console.log('\n📝 Processed Content Preview:');
      console.log(claudeResponse.processed_content.substring(0, 500) + '...');
      
    } else if (claudeResponse.raw_content) {
      console.log('\n⚠️ Only raw_content found (no HTML links processed)');
      console.log('Length:', claudeResponse.raw_content.length);
      console.log('Preview:', claudeResponse.raw_content.substring(0, 300) + '...');
    } else {
      console.log('❌ No content found in claude_response');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

// Load environment variables
dotenv.config({ path: '.env.local' });
debugMovie805();