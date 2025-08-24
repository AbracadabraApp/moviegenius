// Debug script to trace the processed_content data flow issue
// This will show us exactly how the data is stored and transmitted

import { MovieService } from './lib/railway-db.js';

async function debugDataFlow() {
  try {
    console.log('🔍 Testing data flow from database to API to component...\n');
    
    // Get a movie with processed_content (pick a common one)
    const movie = await MovieService.getMovieByTMDBId('550'); // Fight Club
    if (!movie) {
      console.log('❌ Movie not found, trying another...');
      return;
    }
    
    console.log(`✅ Found movie: ${movie.title} (${movie.year})`);
    console.log(`📊 Movie ID: ${movie.id}`);
    
    // Get the analysis
    const analysis = await MovieService.getMovieAnalysis(movie.id);
    if (!analysis) {
      console.log('❌ No analysis found for this movie');
      return;
    }
    
    console.log('\n🔍 ANALYSIS STRUCTURE:');
    console.log('Raw analysis object keys:', Object.keys(analysis));
    
    // Check claude_response structure
    const claudeResponse = analysis.claude_response;
    console.log('\n🔍 CLAUDE_RESPONSE STRUCTURE:');
    console.log('Type:', typeof claudeResponse);
    
    if (typeof claudeResponse === 'string') {
      console.log('❗ claude_response is a string - this might be the issue!');
      console.log('First 200 chars:', claudeResponse.substring(0, 200));
      
      try {
        const parsed = JSON.parse(claudeResponse);
        console.log('✅ Successfully parsed claude_response string');
        console.log('Parsed keys:', Object.keys(parsed));
        
        if (parsed.processed_content) {
          console.log('\n🔍 PROCESSED_CONTENT ANALYSIS:');
          console.log('Type:', typeof parsed.processed_content);
          
          if (typeof parsed.processed_content === 'string') {
            console.log('First 200 chars:', parsed.processed_content.substring(0, 200));
            console.log('Contains double escapes?', parsed.processed_content.includes('\\\"'));
          } else {
            console.log('processed_content object keys:', Object.keys(parsed.processed_content));
          }
        }
      } catch (e) {
        console.log('❌ Failed to parse claude_response string:', e.message);
      }
    } else if (claudeResponse && typeof claudeResponse === 'object') {
      console.log('✅ claude_response is an object');
      console.log('Object keys:', Object.keys(claudeResponse));
      
      if (claudeResponse.processed_content) {
        console.log('\n🔍 PROCESSED_CONTENT ANALYSIS:');
        console.log('Type:', typeof claudeResponse.processed_content);
        
        if (typeof claudeResponse.processed_content === 'string') {
          console.log('First 200 chars:', claudeResponse.processed_content.substring(0, 200));
          console.log('Contains double escapes?', claudeResponse.processed_content.includes('\\\"'));
          
          // Try to parse the string
          try {
            const parsed = JSON.parse(claudeResponse.processed_content);
            console.log('✅ Successfully parsed processed_content string');
            console.log('Parsed structure keys:', Object.keys(parsed));
          } catch (e) {
            console.log('❌ Failed to parse processed_content string:', e.message);
            console.log('🔍 Error details:', e.name, '-', e.message);
          }
        } else {
          console.log('processed_content object keys:', Object.keys(claudeResponse.processed_content));
        }
      } else {
        console.log('❌ No processed_content in claude_response');
      }
    } else {
      console.log('❌ claude_response is null or invalid type');
    }
    
    console.log('\n🔍 API SIMULATION:');
    console.log('This is what the API would return:');
    
    // Simulate the API response structure (from lines 299-322)
    const apiResponse = {
      success: true,
      analysis: claudeResponse.raw_content || claudeResponse,
      rawAnalysis: claudeResponse.raw_content || claudeResponse,
      claude_response: claudeResponse,  // This is the key line!
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      }
    };
    
    console.log('claude_response type in API response:', typeof apiResponse.claude_response);
    if (apiResponse.claude_response && apiResponse.claude_response.processed_content) {
      console.log('processed_content type in API response:', typeof apiResponse.claude_response.processed_content);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDataFlow();